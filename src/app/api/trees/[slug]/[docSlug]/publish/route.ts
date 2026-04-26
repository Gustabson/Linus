import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { copySectionFields } from "@/lib/sections";
import type { VersionStatus } from "@prisma/client";

type Params = { params: Promise<{ slug: string; docSlug: string }> };

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;

  // Verify ownership
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true, title: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sections: { orderBy: { sectionOrder: "asc" } } },
      },
    },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  // If already published, return existing hash (idempotent)
  if (latestVersion.status === "PUBLISHED") {
    return NextResponse.json({
      contentHash:  latestVersion.contentHash,
      alreadyPublished: true,
    });
  }

  const { commitMessage } = await req.json().catch(() => ({ commitMessage: "" }));

  // Compute a meaningful content hash from the actual section content
  const contentHash = sha256(
    JSON.stringify(
      latestVersion.sections.map((s) => ({
        type:    s.sectionType,
        order:   s.sectionOrder,
        content: s.richTextContent,
      }))
    )
  );

  const msg = commitMessage?.trim() || "Publicación";

  // Transaction:
  // 1. Mark current DRAFT as PUBLISHED with the content hash + commit message
  // 2. Clone its sections into a fresh DRAFT (the new working copy)
  // 3. Point document.currentVersionId to the new DRAFT
  const { publishedVersionId, newDraftSections } = await prisma.$transaction(async (tx) => {
    // Promote draft → published
    const published = await tx.documentVersion.update({
      where: { id: latestVersion.id },
      data: {
        status:        "PUBLISHED" as VersionStatus,
        contentHash,
        commitMessage: msg,
      },
    });

    // Create a fresh, clean DRAFT for future edits
    const newDraft = await tx.documentVersion.create({
      data: {
        documentId:      doc.id,
        authorId:        session.user.id,
        status:          "DRAFT" as VersionStatus,
        parentVersionId: published.id,
        sections: {
          create: latestVersion.sections.map(copySectionFields),
        },
      },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });

    // Working copy is now the new DRAFT
    await tx.document.update({
      where: { id: doc.id },
      data:  { currentVersionId: newDraft.id },
    });

    return { publishedVersionId: published.id, newDraftSections: newDraft.sections };
  });

  // Write the ledger entry AFTER the transaction (network call, outside tx)
  await writeLedgerEntry({
    eventType:    "VERSION_COMMITTED",
    subjectId:    publishedVersionId,
    subjectType:  "version",
    eventPayload: {
      documentId:    doc.id,
      treeSlug:      slug,
      docSlug,
      contentHash,
      commitMessage: msg,
    },
    actorId: session.user.id,
  });

  // Build sectionIdMap: old DRAFT section ID → new DRAFT section ID
  // Matched by sectionOrder (stable positional index within a version)
  const sectionIdMap: Record<string, string> = {};
  for (let i = 0; i < latestVersion.sections.length; i++) {
    if (newDraftSections[i]) {
      sectionIdMap[latestVersion.sections[i].id] = newDraftSections[i].id;
    }
  }

  return NextResponse.json({ contentHash, sectionIdMap, commitMessage: msg });
}
