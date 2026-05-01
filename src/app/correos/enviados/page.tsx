import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CorreosList } from "@/components/correos/CorreosList";

export const dynamic = "force-dynamic";

export default async function EnviadosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const messages = await prisma.message.findMany({
    where: {
      senderId:        session.user.id,
      isDraft:         false,
      deletedBySender: false,
      recipientId:     { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, subject: true, isRead: true, createdAt: true, body: true,
      recipient: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  // Normalize shape: use recipient as the "other person" display
  const normalized = messages.map((m) => ({
    id:        m.id,
    subject:   m.subject,
    isRead:    m.isRead,
    createdAt: m.createdAt.toISOString(),
    body:      m.body,
    sender:    m.recipient ?? { id: "", name: "Desconocido", username: null, image: null },
  }));

  return (
    <CorreosList
      messages={normalized}
      folder="enviados"
      currentUserId={session.user.id}
    />
  );
}
