import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { CorreosList } from "@/components/correos/CorreosList";
import { LoginRequired } from "@/components/shared/LoginRequired";

export const dynamic = "force-dynamic";

export default async function BorradoresPage() {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="los correos" />;

  const messages = await prisma.message.findMany({
    where: {
      parentId:        null,
      senderId:        session.user.id,
      isDraft:         true,
      deletedBySender: false,
    },
    orderBy: { createdAt: "desc" },
    take: 31,
    select: {
      id: true, subject: true, isRead: true, createdAt: true, body: true,
      recipient: { select: USER_BASIC_SELECT },
    },
  });

  const hasMore = messages.length > 30;
  if (hasMore) messages.pop();
  const initialCursor = hasMore && messages.length > 0
    ? messages[messages.length - 1].createdAt.toISOString()
    : null;

  const normalized = messages.map((m) => ({
    id:        m.id,
    subject:   m.subject,
    isRead:    true,           // drafts are always "read"
    createdAt: m.createdAt.toISOString(),
    body:      m.body,
    sender:    m.recipient ?? { id: "", name: "Sin destinatario", username: null, image: null },
  }));

  return (
    <CorreosList
      messages={normalized}
      folder="borradores"
      initialCursor={initialCursor}
    />
  );
}
