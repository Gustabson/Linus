import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LockKeyhole } from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import { ProposalConversation } from "@/components/proposals/ProposalConversation";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
  routePrefix = "",
}: {
  params: Promise<{ id: string }>;
  routePrefix?: string;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`${routePrefix}/login`);

  const proposal = await prisma.changeProposal.findUnique({
    where: { id },
    include: {
      targetTree: {
        select: {
          slug: true,
          title: true,
          contentType: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, image: true } },
        },
      },
      targetDocument: { select: { slug: true, title: true } },
      author: { select: { id: true, name: true, username: true, image: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      },
    },
  });
  if (!proposal) notFound();

  const userId = session.user.id;
  if (proposal.authorId !== userId && proposal.targetTree.ownerId !== userId) notFound();

  const style = CONTENT_TYPE_STYLE[proposal.targetTree.contentType];
  const ownerSlug = proposal.targetTree.owner.username ?? proposal.targetTree.owner.id;
  const contentHref = proposal.targetDocument
    ? `/${ownerSlug}/${proposal.targetTree.slug}/${proposal.targetDocument.slug}`
    : `/${ownerSlug}/${proposal.targetTree.slug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/propuestas" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a propuestas
      </Link>

      <header className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-primary">
          <LockKeyhole className="h-4 w-4" /> Conversación privada
        </div>
        <h1 className="mt-2 text-xl font-bold text-text sm:text-2xl">{proposal.title}</h1>
        <Link href={contentHref} className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg p-3 transition-colors hover:border-primary/30">
          <span className="min-w-0">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badgeCls}`}>{style.label}</span>
            <span className="mt-1 block truncate text-sm font-bold text-text">{proposal.targetTree.title}</span>
            {proposal.targetDocument && <span className="block truncate text-xs text-text-muted">Documento: {proposal.targetDocument.title}</span>}
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-text-subtle" />
        </Link>
      </header>

      <ProposalConversation
        proposalId={proposal.id}
        currentUserId={userId}
        initialEntries={[
          ...(proposal.description ? [{
            id: `initial-${proposal.id}`,
            content: proposal.description,
            createdAt: proposal.createdAt.toISOString(),
            sender: proposal.author,
          }] : []),
          ...proposal.messages.map((message) => ({
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            sender: message.sender,
          })),
        ]}
      />
    </div>
  );
}
