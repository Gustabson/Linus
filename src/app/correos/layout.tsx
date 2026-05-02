import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CorreosSidebar } from "@/components/correos/CorreosSidebar";

export const dynamic = "force-dynamic";

export default async function CorreosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const unreadCount = await prisma.message.count({
    where: {
      recipientId:        session.user.id,
      isRead:             false,
      isDraft:            false,
      deletedByRecipient: false,
    },
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] lg:h-[calc(100vh-1.5rem)] bg-surface rounded-2xl border border-border overflow-hidden">
      <CorreosSidebar unreadCount={unreadCount} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
