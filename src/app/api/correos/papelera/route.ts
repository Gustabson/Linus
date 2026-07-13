import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { revalidatePath } from "next/cache";

export async function DELETE(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
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

  revalidatePath("/correos", "layout");
  revalidatePath("/linus-2/correos", "layout");
  return NextResponse.json({ ok: true, count: sent.count + received.count });
}
