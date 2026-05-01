import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight, GitPullRequest, CheckCircle, XCircle,
  MinusCircle, Clock, GitMerge, ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import type { ProposalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_META: Record<ProposalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  OPEN:      { label: "Abierta",   cls: "bg-blue-50 text-blue-700",   icon: <Clock       className="w-4 h-4" /> },
  ACCEPTED:  { label: "Aceptada",  cls: "bg-primary/5 text-primary", icon: <CheckCircle className="w-4 h-4" /> },
  REJECTED:  { label: "Rechazada", cls: "bg-red-50 text-red-600",     icon: <XCircle     className="w-4 h-4" /> },
  WITHDRAWN: { label: "Retirada",  cls: "bg-border-subtle text-text-muted",  icon: <MinusCircle className="w-4 h-4" /> },
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const proposal = await prisma.changeProposal.findUnique({
    where:   { id },
    include: {
      sourceTree: { select: { slug: true, title: true, ownerId: true, owner: { select: { username: true } } } },
      targetTree: { select: { slug: true, title: true, ownerId: true, owner: { select: { username: true } } } },
      author:     { select: { name: true, username: true, image: true } },
      reviewer:   { select: { name: true, username: true } },
    },
  });

  if (!proposal) notFound();

  const userId        = session.user.id;
  const isAuthor      = proposal.authorId === userId;
  const isTargetOwner = proposal.targetTree.ownerId === userId;
  if (!isAuthor && !isTargetOwner) notFound();

  // Fetch docs from both trees
  const docSelect = {
    select: {
      id: true, slug: true, title: true,
      versions: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        include: { sections: { orderBy: { sectionOrder: "asc" as const } } },
      },
    },
  };
  const [sourceDocs, targetDocs] = await Promise.all([
    prisma.document.findMany({ where: { treeId: proposal.sourceTreeId }, ...docSelect }),
    prisma.document.findMany({ where: { treeId: proposal.targetTreeId }, ...docSelect }),
  ]);

  const meta = STATUS_META[proposal.status];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/propuestas" className="hover:text-text">Propuestas</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-text truncate">{proposal.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-text">{proposal.title}</h1>
              <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${meta.cls}`}>
                {meta.icon} {meta.label}
              </span>
            </div>
            {proposal.description && (
              <p className="text-text-muted text-sm">{proposal.description}</p>
            )}
          </div>
        </div>

        {/* Flow: source → target */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <Link href={`/${proposal.sourceTree.owner.username ?? proposal.sourceTree.ownerId}/${proposal.sourceTree.slug}`}
            className="flex items-center gap-1.5 bg-bg border border-border px-3 py-1.5 rounded-lg hover:border-primary/30 transition-colors">
            <GitPullRequest className="w-3.5 h-3.5 text-text-subtle" />
            <span className="font-medium">{proposal.sourceTree.title}</span>
          </Link>
          <ArrowRight className="w-4 h-4 text-text-subtle shrink-0" />
          <Link href={`/${proposal.targetTree.owner.username ?? proposal.targetTree.ownerId}/${proposal.targetTree.slug}`}
            className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-lg hover:border-primary/40 transition-colors">
            <GitMerge className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{proposal.targetTree.title}</span>
          </Link>
        </div>

        {/* Author + dates */}
        <div className="flex items-center gap-3 text-xs text-text-subtle flex-wrap">
          {proposal.author.image ? (
            <Image src={proposal.author.image} alt="" width={18} height={18} className="rounded-full" />
          ) : (
            <div className="w-4.5 h-4.5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(proposal.author.name ?? "?")[0]}
            </div>
          )}
          <span>
            Por{" "}
            <Link href={`/${proposal.author.username ?? ""}`} className="text-primary hover:underline">
              {proposal.author.name}
            </Link>
            {" · "}{formatDate(proposal.createdAt)}
          </span>
          {proposal.reviewedAt && proposal.reviewer && (
            <span>· Revisada por {proposal.reviewer.name} el {formatDate(proposal.reviewedAt)}</span>
          )}
        </div>

        {/* Action buttons */}
        {proposal.status === "OPEN" && (
          <ProposalActions
            proposalId={id}
            isAuthor={isAuthor}
            isTargetOwner={isTargetOwner}
          />
        )}
      </div>

      {/* Diff section */}
      <div className="space-y-4">
        <h2 className="font-semibold text-text text-sm uppercase tracking-wide text-text-subtle">
          Cambios propuestos
        </h2>

        {sourceDocs.length === 0 ? (
          <p className="text-sm text-text-subtle">No hay documentos en el fork.</p>
        ) : (
          sourceDocs.map((sourceDoc) => {
            const targetDoc = targetDocs.find((d) => d.slug === sourceDoc.slug);
            const sourceSections = sourceDoc.versions[0]?.sections ?? [];
            const targetSections = targetDoc?.versions[0]?.sections ?? [];

            return (
              <div key={sourceDoc.id} className="bg-surface rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border-subtle bg-bg">
                  <p className="font-medium text-text text-sm">{sourceDoc.title}</p>
                  {!targetDoc && (
                    <p className="text-xs text-amber-600 mt-0.5">Documento nuevo — no existe en el original</p>
                  )}
                </div>

                {sourceSections.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-text-subtle">Sin secciones</p>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {sourceSections.map((sourceSection) => {
                      const targetSection = targetSections.find(
                        (s) => s.sectionType === sourceSection.sectionType
                      );
                      const hasChanges =
                        !targetSection ||
                        JSON.stringify(targetSection.richTextContent) !==
                          JSON.stringify(sourceSection.richTextContent);

                      return (
                        <div key={sourceSection.id} className={`grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-subtle ${hasChanges ? "" : "opacity-50"}`}>
                          {/* Target (original) */}
                          <div className="p-4">
                            <p className="text-xs font-medium text-text-subtle mb-2 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                              Original · {sourceSection.sectionType}
                            </p>
                            {targetSection ? (
                              <RichTextPreview content={targetSection.richTextContent} />
                            ) : (
                              <p className="text-xs text-gray-300 italic">Sección nueva</p>
                            )}
                          </div>

                          {/* Source (proposed) */}
                          <div className={`p-4 ${hasChanges ? "bg-primary/5/30" : ""}`}>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5 ${hasChanges ? 'text-primary' : 'text-text-subtle'}">
                              <span className={`w-2 h-2 rounded-full inline-block ${hasChanges ? "bg-primary" : "bg-gray-300"}`} />
                              Propuesto · {sourceSection.sectionType}
                              {hasChanges && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">modificado</span>}
                            </p>
                            <RichTextPreview content={sourceSection.richTextContent} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Simple text extractor from TipTap JSON
function RichTextPreview({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") return <p className="text-xs text-gray-300 italic">Vacío</p>;

  function extractText(node: Record<string, unknown>): string {
    if (node.type === "text") return String(node.text ?? "");
    if (Array.isArray(node.content)) {
      return (node.content as Record<string, unknown>[]).map(extractText).join(" ");
    }
    return "";
  }

  const text = extractText(content as Record<string, unknown>).trim();
  if (!text) return <p className="text-xs text-gray-300 italic">Vacío</p>;
  return <p className="text-xs text-text leading-relaxed line-clamp-4">{text}</p>;
}
