import { auth } from "@/lib/auth";
import { LoginRequired } from "@/components/shared/LoginRequired";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Inbox, Send, LockKeyhole, MessageSquareText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

const includeConversation = {
  targetTree: {
    select: {
      title: true,
      contentType: true,
      owner: { select: { id: true, name: true, username: true, image: true } },
    },
  },
  targetDocument: { select: { title: true } },
  author: { select: { id: true, name: true, username: true, image: true } },
  _count: { select: { messages: true } },
} as const;

export default async function PropuestasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="las propuestas" />;

  const { tab = "recibidas" } = await searchParams;
  const userId = session.user.id;
  const [received, sent] = await Promise.all([
    prisma.changeProposal.findMany({
      where: { targetTree: { ownerId: userId }, authorId: { not: userId } },
      include: includeConversation,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.changeProposal.findMany({
      where: { authorId: userId },
      include: includeConversation,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const isSent = tab === "enviadas";
  const active = isSent ? sent : received;
  const unreadCount = received.filter((item) => item.recipientUnread).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          <LockKeyhole className="h-4 w-4" /> Conversaciones privadas
        </div>
        <h1 className="text-2xl font-bold text-text">Propuestas</h1>
        <p className="text-sm text-text-muted">Consultas y sugerencias privadas vinculadas al contenido educativo.</p>
      </header>

      <nav className="grid grid-cols-2 rounded-xl border border-border bg-surface p-1" aria-label="Bandejas de propuestas">
        {[
          { key: "recibidas", label: "Recibidas", count: received.length, icon: Inbox },
          { key: "enviadas", label: "Enviadas", count: sent.length, icon: Send },
        ].map((item) => {
          const Icon = item.icon;
          const selected = (isSent ? "enviadas" : "recibidas") === item.key;
          return (
            <Link
              key={item.key}
              href={`/propuestas?tab=${item.key}`}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${selected ? "bg-primary text-primary-fg shadow-sm" : "text-text-muted hover:bg-bg hover:text-text"}`}
            >
              <Icon className="h-4 w-4" /> {item.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${selected ? "bg-white/15" : "bg-bg"}`}>{item.count}</span>
              {item.key === "recibidas" && unreadCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-danger" aria-label={`${unreadCount} sin leer`} />
              )}
            </Link>
          );
        })}
      </nav>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-text-subtle" />
          <p className="font-semibold text-text">No hay propuestas {isSent ? "enviadas" : "recibidas"}</p>
          <p className="mt-1 text-sm text-text-muted">Las conversaciones aparecerán acá cuando se inicien desde un documento.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {active.map((proposal, index) => {
            const person = isSent ? proposal.targetTree.owner : proposal.author;
            const unread = isSent ? proposal.authorUnread : proposal.recipientUnread;
            const style = CONTENT_TYPE_STYLE[proposal.targetTree.contentType];
            return (
              <Link
                key={proposal.id}
                href={`/propuestas/${proposal.id}`}
                className={`group flex gap-3 p-4 transition-colors hover:bg-bg ${index > 0 ? "border-t border-border-subtle" : ""}`}
              >
                {person.image ? (
                  <Image src={person.image} alt="" width={42} height={42} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(person.name ?? person.username ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`truncate text-sm ${unread ? "font-extrabold text-text" : "font-semibold text-text"}`}>{proposal.title}</p>
                    <time className="shrink-0 text-[11px] text-text-subtle">{formatDate(proposal.updatedAt)}</time>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {isSent ? "Para" : "De"} {person.name ?? `@${person.username ?? "usuario"}`}
                    {person.username ? ` · @${person.username}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-subtle">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${style.badgeCls}`}>{style.label}</span>
                    <span className="truncate">{proposal.targetTree.title}{proposal.targetDocument ? ` · ${proposal.targetDocument.title}` : ""}</span>
                    <span>{proposal._count.messages + 1} mensaje{proposal._count.messages === 0 ? "" : "s"}</span>
                    {unread && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">Nuevo</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
