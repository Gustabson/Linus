import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { notFound, redirect } from "next/navigation";
import { CorreosDetalle } from "@/components/correos/CorreosDetalle";

export const dynamic = "force-dynamic";

export default async function CorreoDetallePage({
  params,
  routePrefix = "",
}: {
  params: Promise<{ id: string }>;
  routePrefix?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(routePrefix || "/");

  const { id } = await params;

  const message = await prisma.message.findFirst({
    where: { id, parentId: null },
    include: {
      sender:    { select: USER_BASIC_SELECT },
      recipient: { select: USER_BASIC_SELECT },
      replies: {
        where:   { deletedByRecipient: false, deletedBySender: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: USER_BASIC_SELECT } },
      },
    },
  });

  if (!message) notFound();

  const isRecipient = message.recipientId === session.user.id;
  const isSender    = message.senderId    === session.user.id;

  // ── Only the sender or recipient may view this message
  if (!isRecipient && !isSender) notFound();
  if (isSender    && message.deletedBySender)    notFound();
  if (isRecipient && message.deletedByRecipient) notFound();

  // ── Auto-mark as read server-side
  if (isRecipient && !message.isRead) {
    await prisma.message.update({ where: { id }, data: { isRead: true } });
  }

  // Serialize dates for client components
  const serialized = {
    ...message,
    createdAt: message.createdAt.toISOString(),
    replies: message.replies.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  const backHref  = isRecipient ? `${routePrefix}/correos` : `${routePrefix}/correos/enviados`;
  const backLabel = isRecipient ? "Bandeja de entrada" : "Enviados";

  return (
    <CorreosDetalle
      message={serialized}
      currentUserId={session.user.id}
      isRecipient={isRecipient}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
