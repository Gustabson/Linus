import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

export async function DELETE() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [sent, received] = await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        parentId: null,
        senderId: session.user.id,
        deletedBySender: true,
        purgedBySender: false,
      },
      data: { purgedBySender: true },
    }),
    prisma.message.updateMany({
      where: {
        parentId: null,
        recipientId: session.user.id,
        deletedByRecipient: true,
        purgedByRecipient: false,
      },
      data: { purgedByRecipient: true },
    }),
  ]);

  return NextResponse.json({ ok: true, count: sent.count + received.count });
}
