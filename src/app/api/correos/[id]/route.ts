import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

const USER_SELECT = { id: true, name: true, username: true, image: true } as const;

// ── GET /api/correos/[id] — fetch + auto-mark read ────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender:    { select: USER_SELECT },
      recipient: { select: USER_SELECT },
      replies: {
        where:   { deletedByRecipient: false, deletedBySender: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: USER_SELECT } },
      },
    },
  });

  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isRecipient = message.recipientId === session.user.id;
  const isSender    = message.senderId    === session.user.id;

  // ── Access control: only sender or recipient may read this message
  if (!isRecipient && !isSender) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  // ── Respect soft-delete per side
  if (isSender    && message.deletedBySender)    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (isRecipient && message.deletedByRecipient) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // ── Mark as read if recipient is viewing for the first time
  if (isRecipient && !message.isRead) {
    await prisma.message.update({ where: { id }, data: { isRead: true } });
  }

  return NextResponse.json({ ...message, isRead: isRecipient ? true : message.isRead });
}

// ── DELETE /api/correos/[id] — soft delete (per side) ────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  const message = await prisma.message.findUnique({
    where:  { id },
    select: { senderId: true, recipientId: true },
  });

  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isRecipient = message.recipientId === session.user.id;
  const isSender    = message.senderId    === session.user.id;

  if (!isRecipient && !isSender) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  await prisma.message.update({
    where: { id },
    data: {
      ...(isSender    ? { deletedBySender:    true } : {}),
      ...(isRecipient ? { deletedByRecipient: true } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
