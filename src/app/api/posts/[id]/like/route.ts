import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "post:like", userId: session.user.id, limit: 60, windowMs: 60_000,
  });
  if (limited) return limited;

  const { id: postId } = await params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.postLike.findUnique({
          where: { postId_userId: { postId, userId: session.user.id } },
          select: { id: true },
        });
        if (existing) {
          await tx.postLike.delete({ where: { id: existing.id } });
        } else {
          await tx.postLike.create({ data: { postId, userId: session.user.id } });
        }
        const count = await tx.postLike.count({ where: { postId } });
        return { liked: !existing, count };
      }, { isolationLevel: "Serializable" });
      if (result.liked) {
        await createNotification({
          type: "NEW_LIKE",
          recipientId: post.authorId,
          actorId: session.user.id,
          link: `/post/${postId}`,
        });
      }
      return NextResponse.json(result);
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === 2) throw error;
    }
  }

  return NextResponse.json({ error: "No se pudo actualizar el Me gusta" }, { status: 503 });
}
