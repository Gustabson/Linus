import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: followingId } = await params;

  if (followingId === session.user.id) {
    return NextResponse.json({ error: "No podés seguirte a vos mismo" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId } },
    create: { followerId: session.user.id, followingId },
    update: {},
  });

  await writeLedgerEntry({
    eventType: "USER_FOLLOWED",
    subjectId: followingId,
    subjectType: "User",
    eventPayload: { followerId: session.user.id, followingId },
    actorId: session.user.id,
  });

  const count = await prisma.userFollow.count({ where: { followingId } });
  return NextResponse.json({ following: true, count });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: followingId } = await params;

  await prisma.userFollow.deleteMany({
    where: { followerId: session.user.id, followingId },
  });

  await writeLedgerEntry({
    eventType: "USER_UNFOLLOWED",
    subjectId: followingId,
    subjectType: "User",
    eventPayload: { followerId: session.user.id, followingId },
    actorId: session.user.id,
  });

  const count = await prisma.userFollow.count({ where: { followingId } });
  return NextResponse.json({ following: false, count });
}
