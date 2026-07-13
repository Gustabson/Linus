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
    <div className="flex h-[calc(100dvh-4.75rem)] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm md:mb-6 md:h-[calc(100dvh-5rem)] md:flex-row lg:h-[calc(100dvh-3rem)]">
      <CorreosSidebar unreadCount={unreadCount} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
