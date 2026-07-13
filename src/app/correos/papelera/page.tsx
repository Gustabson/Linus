import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { CorreosList } from "@/components/correos/CorreosList";
import { LoginRequired } from "@/components/shared/LoginRequired";

export const dynamic = "force-dynamic";

export default async function PapeleraPage() {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="la papelera" />;

  const messages = await prisma.message.findMany({
    where: {
      parentId: null,
      OR: [
        { senderId: session.user.id, deletedBySender: true, purgedBySender: false },
        { recipientId: session.user.id, deletedByRecipient: true, purgedByRecipient: false },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 31,
    select: {
      id: true,
      subject: true,
      isRead: true,
      isDraft: true,
      createdAt: true,
      body: true,
      senderId: true,
      sender: { select: USER_BASIC_SELECT },
      recipient: { select: USER_BASIC_SELECT },
    },
  });

  const hasMore = messages.length > 30;
  if (hasMore) messages.pop();
  const initialCursor = hasMore && messages.length > 0
    ? messages[messages.length - 1].createdAt.toISOString()
    : null;

  const normalized = messages.map(({ senderId, sender, recipient, isDraft, ...message }) => {
    const sentByCurrentUser = senderId === session.user.id;
    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
      isRead: true,
      origin: (isDraft ? "borradores" : sentByCurrentUser ? "enviados" : "bandeja") as "bandeja" | "enviados" | "borradores",
      sender: sentByCurrentUser
        ? (recipient ?? { id: "", name: "Sin destinatario", username: null, image: null })
        : sender,
    };
  });

  return <CorreosList messages={normalized} folder="papelera" initialCursor={initialCursor} />;
}
