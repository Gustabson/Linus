import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { getSession, unauthorized } from "@/lib/api-helpers";
import type { VersionStatus } from "@prisma/client";

type Params = { params: Promise<{ slug: string }> };

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");

/**
 * POST /api/trees/[slug]/publish
 *
 * Publishes the entire tree (kernel, module, or resource) as one atomic unit.
 *
 * - For kernels:  hashes ALL documents' content combined.
 * - For modules/resources: same formula — they have exactly one document.
 *
 * The resulting hash lives on the DocumentTree, not on individual versions.
 * Ledger entry is written once for the tree, not per document.
 *
 * Also marks all current document versions as PUBLISHED so the per-document
 * historial page stays meaningful (shows "included in this tree publish").
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where:   { slug },
    select:  { id: true, ownerId: true, contentType: true, title: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  // Fetch all documents with their current sections (latest version)
  const documents = await prisma.document.findMany({
    where:   { treeId: tree.id },
    orderBy: { createdAt: "asc" },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take:    1,
        include: { sections: { orderBy: { sectionOrder: "asc" } } },
      },
    },
  });

  if (documents.length === 0)
    return NextResponse.json({ error: "No hay documentos para publicar" }, { status: 400 });

  const { commitMessage = "" } = await req.json().catch(() => ({ commitMessage: "" }));
  const msg = String(commitMessage).trim() || "Publicación";

  // Compute a deterministic hash over the full content of every document
  const contentHash = sha256(
    JSON.stringify(
      documents.map((doc) => {
        const latest = doc.versions[0];
        return {
          title:    doc.title,
          sections: (latest?.sections ?? []).map((s) => ({
            type:    s.sectionType,
            order:   s.sectionOrder,
            content: s.richTextContent,
          })),
        };
      })
    )
  );

  const now = new Date();

  // Transaction:
  // 1. Update the tree's publication seal
  // 2. Mark all current document versions as PUBLISHED (so historial is accurate)
  await prisma.$transaction(async (tx) => {
    // Seal the tree
    await tx.documentTree.update({
      where: { id: tree.id },
      data:  { contentHash, publishedAt: now, publishCommitMessage: msg },
    });

    // Mark each document's current version as PUBLISHED
    for (const doc of documents) {
      const currentVersion = doc.versions[0];
      if (currentVersion && currentVersion.status === ("DRAFT" as VersionStatus)) {
        await tx.documentVersion.update({
          where: { id: currentVersion.id },
          data:  { status: "PUBLISHED" as VersionStatus },
        });
      }
    }
  });

  // Write one ledger entry for the whole tree
  await writeLedgerEntry({
    eventType:    "VERSION_COMMITTED",
    subjectId:    tree.id,
    subjectType:  "tree",
    eventPayload: {
      treeSlug:     slug,
      contentType:  tree.contentType,
      contentHash,
      commitMessage: msg,
      documentCount: documents.length,
    },
    actorId: session.user.id,
  });

  return NextResponse.json({ contentHash, publishedAt: now.toISOString() });
}
