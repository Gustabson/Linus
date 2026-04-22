import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { slugify, SECTION_ORDER } from "@/lib/utils";
import { createHash } from "crypto";

const EMPTY_SECTION = { type: "doc", content: [] };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { title } = await req.json();
  if (!title?.trim())
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const baseSlug = slugify(title);
  let docSlug = baseSlug;
  let attempt = 0;
  while (
    await prisma.document.findUnique({
      where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    })
  ) {
    attempt++;
    docSlug = `${baseSlug}-${attempt}`;
  }

  const contentHash = createHash("sha256")
    .update(title + docSlug)
    .digest("hex");

  const doc = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.document.create({
      data: { treeId: tree.id, slug: docSlug, title: title.trim() },
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: newDoc.id,
        authorId: session.user.id,
        commitMessage: "Documento creado",
        contentHash,
        sections: {
          create: SECTION_ORDER.map((type, idx) => ({
            sectionType: type as never,
            sectionOrder: idx,
            difficultyLevel: "BEGINNER" as never,
            isComplete: false,
            richTextContent: EMPTY_SECTION,
          })),
        },
      },
    });

    await tx.document.update({
      where: { id: newDoc.id },
      data: { currentVersionId: version.id },
    });

    return newDoc;
  });

  await writeLedgerEntry({
    eventType: "DOCUMENT_CREATED",
    subjectId: doc.id,
    subjectType: "document",
    eventPayload: { documentId: doc.id, treeId: tree.id, title: doc.title },
    actorId: session.user.id,
  });

  return NextResponse.json({ slug: docSlug });
}
