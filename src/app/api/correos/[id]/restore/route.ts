import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const message = await prisma.message.findUnique({
    where: { id },
    select: {
      senderId: true,
      recipientId: true,
      deletedBySender: true,
      deletedByRecipient: true,
    },
  });
  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const restoreAsSender = message.senderId === session.user.id && message.deletedBySender;
  const restoreAsRecipient = message.recipientId === session.user.id && message.deletedByRecipient;
  if (!restoreAsSender && !restoreAsRecipient) {
    return NextResponse.json({ error: "El mensaje no está en tu papelera" }, { status: 400 });
  }

  await prisma.message.update({
    where: { id },
    data: {
      ...(restoreAsSender ? { deletedBySender: false, purgedBySender: false } : {}),
      ...(restoreAsRecipient ? { deletedByRecipient: false, purgedByRecipient: false } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
