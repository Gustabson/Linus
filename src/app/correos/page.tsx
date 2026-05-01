import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CorreosList } from "@/components/correos/CorreosList";

export const dynamic = "force-dynamic";

export default async function BandejaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

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
      sender: { select: { id: true, name: true, username: true, image: true } },
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
