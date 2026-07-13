import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { notFound, redirect } from "next/navigation";
import { CorreosDetalle } from "@/components/correos/CorreosDetalle";
import { resolveMailView, type MailView } from "@/lib/mail-trash";

export const dynamic = "force-dynamic";

export default async function CorreoDetallePage({
  params,
  searchParams = Promise.resolve({}),
  routePrefix = "",
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ view?: string }>;
  routePrefix?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(routePrefix || "/");

  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  if (view && view !== "sender" && view !== "recipient") notFound();

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
  const isSender = message.senderId === session.user.id;

  // ── Only the sender or recipient may view this message
  if (!isRecipient && !isSender) notFound();
  const activeView = resolveMailView((view ?? null) as MailView | null, {
    isSender,
    isRecipient,
    deletedBySender: message.deletedBySender,
    deletedByRecipient: message.deletedByRecipient,
  });
  if (!activeView) notFound();
  const viewingAsRecipient = activeView === "recipient";

  // ── Auto-mark as read server-side
  if (viewingAsRecipient && !message.isRead) {
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

  const backHref = viewingAsRecipient ? `${routePrefix}/correos` : `${routePrefix}/correos/enviados`;
  const backLabel = viewingAsRecipient ? "Bandeja de entrada" : "Enviados";

  return (
    <CorreosDetalle
      message={serialized}
      currentUserId={session.user.id}
      isRecipient={viewingAsRecipient}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
