import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "comment:like", userId: session.user.id, limit: 60, windowMs: 60_000,
  });
  if (limited) return limited;

  const { id: postId, commentId } = await params;
  const comment = await prisma.postComment.findFirst({
    where: { id: commentId, postId, deletedAt: null },
    select: { id: true },
  });
  if (!comment) return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });

  // Serializable isolation makes the read-toggle-write sequence deterministic
  // across tabs and serverless instances. P2034 is retried a few times.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.postCommentLike.findUnique({
          where: { commentId_userId: { commentId, userId: session.user.id } },
          select: { id: true },
        });
        if (existing) {
          await tx.postCommentLike.delete({ where: { id: existing.id } });
        } else {
          await tx.postCommentLike.create({ data: { commentId, userId: session.user.id } });
        }
        const count = await tx.postCommentLike.count({ where: { commentId } });
        return { liked: !existing, count };
      }, { isolationLevel: "Serializable" });
      return NextResponse.json(result);
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === 2) throw error;
    }
  }

  return NextResponse.json({ error: "No se pudo actualizar el Me gusta" }, { status: 503 });
}
