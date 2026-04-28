import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { getSession, getOwnedTree, unauthorized, forbidden, uniqueSlug } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await getOwnedTree(slug, session.user.id);
  if (!tree) return forbidden();

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const docSlug = await uniqueSlug(title, (s) =>
    prisma.document
      .findUnique({ where: { treeId_slug: { treeId: tree.id, slug: s } }, select: { id: true } })
      .then(Boolean)
  );

  const doc = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.document.create({
      data: { treeId: tree.id, slug: docSlug, title: title.trim() },
    });
    const version = await tx.documentVersion.create({
      data: {
        documentId:    newDoc.id,
        authorId:      session.user.id,
        status:        "DRAFT",
        commitMessage: "Documento creado",
      },
    });
    await tx.document.update({
      where: { id: newDoc.id },
      data:  { currentVersionId: version.id },
    });
    return newDoc;
  });

  await writeLedgerEntry({
    eventType:    "DOCUMENT_CREATED",
    subjectId:    doc.id,
    subjectType:  "document",
    eventPayload: { documentId: doc.id, treeId: tree.id, title: doc.title },
    actorId:      session.user.id,
  });

  return NextResponse.json({ slug: docSlug, id: doc.id });
}
