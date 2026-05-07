import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CorreosSidebar } from "@/components/correos/CorreosSidebar";
import { LoginRequired } from "@/components/shared/LoginRequired";

export const dynamic = "force-dynamic";

export default async function CorreosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="los correos" />;

  const unreadCount = await prisma.message.count({
    where: {
      recipientId:        session.user.id,
      isRead:             false,
      isDraft:            false,
      deletedByRecipient: false,
    },
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-3rem)] md:mb-6 bg-surface rounded-2xl border border-border overflow-hidden">
      <CorreosSidebar unreadCount={unreadCount} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
