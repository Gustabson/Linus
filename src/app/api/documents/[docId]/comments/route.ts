import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  const session = await auth();

  const comments = await prisma.documentComment.findMany({
    where: {
      documentId: docId,
      // Private comments: only visible to the author
      OR: [
        { isPrivate: false },
        { isPrivate: true, authorId: session?.user?.id ?? "" },
      ],
    },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { docId } = await params;

  const doc = await prisma.document.findUnique({
    where:  { id: docId },
    select: { id: true, slug: true, tree: { select: { slug: true, ownerId: true, visibility: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const { content, quotedText, sectionType, isPrivate } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });

  const comment = await prisma.documentComment.create({
    data: {
      documentId: docId,
      authorId: session.user.id,
      content: content.trim(),
      quotedText: quotedText?.trim() || null,
      sectionType: sectionType || null,
      isPrivate: isPrivate === true,
    },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  await writeLedgerEntry({
    eventType: "COMMENT_ADDED",
    subjectId: docId,
    subjectType: "document",
    eventPayload: { commentId: comment.id, isPrivate: comment.isPrivate },
    actorId: session.user.id,
  });

  // Notify tree owner of public comments
  if (!comment.isPrivate && doc.tree.visibility === "PUBLIC") {
    await createNotification({
      type:        "NEW_COMMENT",
      recipientId: doc.tree.ownerId,
      actorId:     session.user.id,
      link:        `/t/${doc.tree.slug}/${doc.slug}`,
    });
  }

  return NextResponse.json(comment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { docId } = await params;
  const { commentId } = await req.json();

  const comment = await prisma.documentComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.documentId !== docId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (comment.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.documentComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
