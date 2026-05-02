import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── GET /api/posts/[id]/comments ──────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const comments = await prisma.postComment.findMany({
    where:   { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json({ comments });
}

// ── POST /api/posts/[id]/comments ─────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: postId } = await params;
  const { content }    = await req.json().catch(() => ({}));

  if (!content?.trim())
    return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
  if (content.trim().length > 500)
    return NextResponse.json({ error: "Máximo 500 caracteres" }, { status: 400 });

  // Verify post exists
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

  const comment = await prisma.postComment.create({
    data: {
      content:  content.trim(),
      postId,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

// ── DELETE /api/posts/[id]/comments ──────────────────────────────────────────
// Body: { commentId: string }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: postId }  = await params;
  const { commentId }   = await req.json().catch(() => ({}));
  if (!commentId)
    return NextResponse.json({ error: "commentId requerido" }, { status: 400 });

  const comment = await prisma.postComment.findUnique({
    where:  { id: commentId },
    select: { authorId: true, postId: true },
  });
  if (!comment || comment.postId !== postId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (comment.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.postComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
