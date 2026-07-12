import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { isMissingDatabaseColumn } from "@/lib/prisma-errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id: postId, commentId } = await params;

  const comment = await prisma.postComment.findFirst({
    where: { id: commentId, postId },
    select: { id: true },
  });
  if (!comment) return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });

  try {
    const existing = await prisma.postCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId: session.user.id } },
      select: { id: true },
    });

    if (existing) {
      await prisma.postCommentLike.delete({ where: { id: existing.id } });
      const count = await prisma.postCommentLike.count({ where: { commentId } });
      return NextResponse.json({ liked: false, count });
    }

    await prisma.postCommentLike.create({ data: { commentId, userId: session.user.id } });
    const count = await prisma.postCommentLike.count({ where: { commentId } });
    return NextResponse.json({ liked: true, count });
  } catch (error) {
    if (isMissingDatabaseColumn(error)) {
      return NextResponse.json(
        { error: "Los likes en comentarios todavía se están habilitando." },
        { status: 503 },
      );
    }
    throw error;
  }
}
