import { auth } from "@/lib/auth";
import { LoginRequired } from "@/components/shared/LoginRequired";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { redirect } from "next/navigation";
import { CorreosList } from "@/components/correos/CorreosList";

export const dynamic = "force-dynamic";

export default async function BandejaPage() {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="los correos" />;

  const messages = await prisma.message.findMany({
    where: {
      recipientId:        session.user.id,
      isDraft:            false,
      deletedByRecipient: false,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, subject: true, isRead: true, createdAt: true, body: true,
      sender: { select: USER_BASIC_SELECT },
    },
  });

  return (
    <CorreosList
      messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      folder="bandeja"
      currentUserId={session.user.id}
    />
  );
}
