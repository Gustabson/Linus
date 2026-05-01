import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { CorreosDetalle } from "@/components/correos/CorreosDetalle";

export const dynamic = "force-dynamic";

export default async function CorreoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender:    { select: { id: true, name: true, username: true, image: true } },
      recipient: { select: { id: true, name: true, username: true, image: true } },
      replies: {
        where:   { deletedByRecipient: false, deletedBySender: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
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

  return (
    <CorreosDetalle
      message={serialized}
      currentUserId={session.user.id}
      isRecipient={isRecipient}
    />
  );
}
