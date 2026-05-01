import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: postId } = await params;

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    const count = await prisma.postLike.count({ where: { postId } });
    return NextResponse.json({ liked: false, count });
  }

  await prisma.postLike.create({ data: { postId, userId: session.user.id } });
  const count = await prisma.postLike.count({ where: { postId } });
  return NextResponse.json({ liked: true, count });
}
