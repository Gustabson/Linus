import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { GitFork, BookOpen, ChevronRight, Settings, GitPullRequest, Eye } from "lucide-react";
import { CONTENT_TYPE_STYLE, KERNEL_NEW_DOC_LABEL } from "@/lib/constants";
import { TreePublishButton } from "@/components/trees/TreePublishButton";
import Link from "next/link";
import Image from "next/image";
import { ForkButton } from "@/components/trees/ForkButton";
import { LikeButton } from "@/components/trees/LikeButton";
import { ExtensionsPanel } from "@/components/trees/ExtensionsPanel";
import { ForkTree } from "@/components/trees/ForkTree";
import { AttachmentsPanel } from "@/components/trees/AttachmentsPanel";
import { CreateProposalButton } from "@/components/proposals/CreateProposalButton";
import { QuickAddDocument } from "@/components/trees/QuickAddDocument";

import { BackButton } from "@/components/shared/BackButton";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { title: true, description: true, contentType: true, visibility: true, owner: { select: { name: true } } },
  });
  if (!tree || tree.visibility === "PRIVATE") return {};
  const typeLabel = tree.contentType === "KERNEL" ? "Kernel" : tree.contentType === "MODULE" ? "Módulo" : "Recurso";
  return {
    title:       tree.title,
    description: tree.description ?? `${typeLabel} educativo por ${tree.owner.name} en EduHub`,
    openGraph:   { title: tree.title, description: tree.description ?? undefined, type: "article" },
  };
}

// Recursively fetch fork tree up to N levels deep
async function fetchForkSubtree(treeId: string, depth: number): Promise<{
  id: string; slug: string; title: string; contentType: string; forkDepth: number;
  owner: { name: string | null; username: string | null; image: string | null };
  _count: { forks: number; likes: number };
  forks: ReturnType<typeof fetchForkSubtree> extends Promise<infer T> ? T[] : never[];
}> {
  const node = await prisma.documentTree.findUnique({
    where: { id: treeId },
    select: {
      id: true, slug: true, title: true, contentType: true, forkDepth: true,
      owner: { select: { name: true, username: true, image: true } },
      _count: { select: { forks: true, likes: true } },
      forks: depth > 0
        ? { where: { visibility: "PUBLIC" }, select: { id: true }, take: 20 }
        : false,
    },
  });

  if (!node) throw new Error("Tree not found");

  const children =
    depth > 0 && node.forks
      ? await Promise.all(node.forks.map((f: { id: string }) => fetchForkSubtree(f.id, depth - 1)))
      : [];

  return { ...node, forks: children };
}

export default async function TreePage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    include: {
      owner: { select: { ...USER_BASIC_SELECT, bio: true } },
      parentTree: { select: { id: true, slug: true, title: true, contentType: true, parentTreeId: true } },
      documents: {
        orderBy: { createdAt: "asc" },
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              sections: { select: { id: true, sectionType: true, isComplete: true } },
            },
          },
        },
      },
      extensions: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true, image: true } } },
      },
      attachments: {
        orderBy: { addedAt: "asc" },
        include: {
          content: {
            select: {
              id: true, slug: true, title: true, contentType: true,
              owner: { select: { name: true, username: true } },
              _count: { select: { likes: true, forks: true } },
            },
          },
        },
      },
      _count: { select: { forks: true, likes: true } },
    },
  });

  if (!tree || tree.owner.username !== username) notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  // Whether the tree has at least one document with a DRAFT (unpublished changes)
  const hasChanges = tree.documents.some((doc) => doc.versions[0]?.status === "DRAFT");

  const latestPublication = await prisma.treePublication.findFirst({
    where:   { treeId: tree.id },
    orderBy: { publishedAt: "desc" },
    select:  { publicId: true },
  });

  // MODULE / RESOURCE are single-document entities — the tree page is invisible to users.
  // Redirect straight to the document editor (auto-created on tree creation).
  if (tree.contentType !== "KERNEL" && tree.documents.length > 0) {
    redirect(`/${tree.owner.username}/${slug}/${tree.documents[0].slug}`);
  }

  const style = CONTENT_TYPE_STYLE[tree.contentType];

  const [userLiked, openProposalsCount, userHasOpenProposal] = await Promise.all([
    session?.user?.id
      ? prisma.treeLike.findUnique({
          where: { treeId_userId: { treeId: tree.id, userId: session.user.id } },
        }).then(Boolean)
      : Promise.resolve(false),
    isOwner
      ? prisma.changeProposal.count({ where: { targetTreeId: tree.id, status: "OPEN" } })
      : Promise.resolve(0),
    // Does this user already have an open proposal for this tree (from their fork)?
    session?.user?.id && !isOwner && tree.parentTree === null
      ? Promise.resolve(false) // not a fork page visitor case
      : session?.user?.id && tree.parentTreeId
        ? prisma.changeProposal.findFirst({
            where: { sourceTreeId: tree.id, authorId: session.user.id, status: "OPEN" },
          }).then(Boolean)
        : Promise.resolve(false),
  ]);

  // Build ancestor chain — collect all ancestor IDs first, then batch query.
  // (was sequential N+1 — each ancestor blocked on the previous)
  const MAX_ANCESTOR_DEPTH = 10;
  const ancestorIds: string[] = [];
  let currentId: string | null = tree.parentTree?.id ?? null;
  let depth = 0;
  while (currentId && depth < MAX_ANCESTOR_DEPTH) {
    ancestorIds.push(currentId);
    // Walk up: fetch only parentTreeId to find the next ancestor
    const node = await prisma.documentTree.findUnique({
      where: { id: currentId },
      select: { parentTreeId: true },
    });
    currentId = node?.parentTreeId ?? null;
    depth++;
  }

  // Batch fetch all ancestor data at once
  const ancestorNodes = ancestorIds.length > 0
    ? await prisma.documentTree.findMany({
        where: { id: { in: ancestorIds } },
        select: { id: true, slug: true, title: true, contentType: true, owner: { select: { username: true } } },
      })
    : [];

  // Build ordered chain (from root to immediate parent)
  const ancestorMap = new Map(ancestorNodes.map((a) => [a.id, a]));
  const ancestors: { id: string; slug: string; title: string; contentType: string; ownerUsername: string | null }[] = [];
  for (const id of ancestorIds) {
    const a = ancestorMap.get(id);
    if (a) {
      ancestors.push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        contentType: a.contentType ?? "KERNEL",
        ownerUsername: a.owner.username,
      });
    }
  }

  // Build fork tree from current tree (3 levels deep)
  const forkTree = await fetchForkSubtree(tree.id, 3);
  const hasForkTree = forkTree.forks.length > 0 || ancestors.length > 0;

  const authorSlug = tree.owner.username ?? tree.owner.id;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      {ancestors.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-text-muted flex-wrap">
          {ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-4 h-4" />}
              <Link href={`/${a.ownerUsername ?? a.id}/${a.slug}`} className="hover:text-text">
                {a.title}
              </Link>
            </span>
          ))}
          <ChevronRight className="w-4 h-4" />
          <span className="text-text">{tree.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        {/* Back button */}
        <BackButton href="/dashboard" />

        {/* Author row */}
        <Link href={`/${authorSlug}`} className="flex items-center gap-3 group w-fit">
          {tree.owner.image ? (
            <Image src={tree.owner.image} alt={tree.owner.name ?? ""} width={40} height={40}
              className="rounded-full ring-2 ring-transparent group-hover:ring-primary/30 transition-all" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
              {(tree.owner.name ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-text group-hover:text-primary transition-colors text-sm">
              {tree.owner.name}
            </p>
            {tree.owner.username && (
              <p className="text-xs text-text-subtle">@{tree.owner.username}</p>
            )}
          </div>
        </Link>

        {/* Title + actions */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {tree.contentType === "KERNEL" && (
                <span className={`${style.badgeCls} text-xs px-2 py-0.5 rounded-full font-medium`}>
                  Kernel oficial
                </span>
              )}
              {tree.forkDepth > 0 && (
                <span className="bg-border-subtle text-text-muted text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  Fork nivel {tree.forkDepth}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text">{tree.title}</h1>
            {tree.description && (
              <p className="text-text-muted">{tree.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <LikeButton treeSlug={tree.slug} initialLiked={userLiked} initialCount={tree._count.likes} isAuthenticated={!!session} />
            {!isOwner && session && (
              <ForkButton treeId={tree.id} treeTitle={tree.title} contentType={tree.contentType} />
            )}
            {/* "Proponer cambios" — only on owned forks, only if no open proposal exists */}
            {isOwner && tree.parentTreeId && !userHasOpenProposal && (
              <CreateProposalButton
                sourceTreeId={tree.id}
                parentTreeTitle={tree.parentTree?.title ?? "el original"}
              />
            )}
            {isOwner && tree.parentTreeId && userHasOpenProposal && (
              <Link href="/propuestas?tab=enviadas"
                className="flex items-center gap-1.5 text-sm text-primary border border-primary/20 bg-primary/5 px-3 py-2 rounded-xl hover:bg-primary/10 transition-colors">
                <GitPullRequest className="w-4 h-4" />
                Propuesta abierta
              </Link>
            )}
            {isOwner && !tree.parentTreeId && openProposalsCount > 0 && (
              <Link href="/propuestas"
                className="flex items-center gap-2 text-sm text-primary border border-primary/20 bg-primary/5 px-3 py-2 rounded-xl hover:bg-primary/10 transition-colors">
                <GitPullRequest className="w-4 h-4" />
                {openProposalsCount} propuesta{openProposalsCount !== 1 ? "s" : ""}
              </Link>
            )}
            {/* Preview — always visible for kernels (shows full read-only view) */}
            <Link href={`/${username}/${slug}/preview`}
              className="flex items-center gap-1.5 text-sm text-text-muted border border-border px-3 py-2 rounded-lg hover:bg-bg transition-colors">
              <Eye className="w-4 h-4" />
              Preview
            </Link>
            {isOwner && (
              <>
                <Link href={`/${username}/${slug}/configuracion`}
                  className="flex items-center gap-1.5 text-sm text-text-muted border border-border px-3 py-2 rounded-lg hover:bg-bg transition-colors">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-sm text-text-muted pt-2 border-t border-border-subtle flex-wrap">
          <span className="flex items-center gap-1">
            <GitFork className="w-4 h-4" />
            {tree._count.forks} forks
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {tree.documents.length} unidad{tree.documents.length !== 1 ? "es" : ""}
          </span>
          <span>{formatDate(tree.createdAt)}</span>
          {/* Publish button (owner only) — lives here next to the stats so hash + publish action feel attached to the entity */}
          {isOwner && (
            <div className="ml-auto">
              <TreePublishButton
                treeSlug={tree.slug}
                contentType={tree.contentType}
                initialPublicId={latestPublication?.publicId ?? null}
                hasChanges={hasChanges}
              />
            </div>
          )}
        </div>

        {/* ── Documents (inside the card — kernel + docs = one visual unit) ── */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Documentos</p>
            {tree.documents.length > 0 && (
              <span className="text-xs bg-border-subtle text-text-muted px-2 py-0.5 rounded-full font-medium">
                {tree.documents.length}
              </span>
            )}
          </div>
        </div>
        <QuickAddDocument
          treeSlug={tree.slug}
          ownerUsername={tree.owner.username ?? ""}
          isOwner={isOwner}
          style={style}
          initialDocs={tree.documents.map((doc) => {
            const lv              = doc.versions[0];
            const total           = lv?.sections.length ?? 0;
            const complete        = lv?.sections.filter((s) => s.isComplete).length ?? 0;
            return {
              id:       doc.id,
              slug:     doc.slug,
              title:    doc.title,
              isDraft:  lv?.status === "DRAFT",
              progress: total > 0 ? Math.round((complete / total) * 100) : 0,
              sections: lv?.sections ?? [],
            };
          })}
        />

      </div>

      {/* Attachments panel — full for kernels, detach-only for modules/resources with legacy data */}
      {(tree.contentType === "KERNEL" || tree.attachments.length > 0) && (
        <AttachmentsPanel
          kernelSlug={tree.slug}
          kernelId={tree.id}
          ownerUsername={tree.owner.username ?? ""}
          initialAttachments={tree.attachments.map((a) => ({
            id: a.id,
            content: a.content,
          }))}
          isOwner={isOwner}
          isKernel={tree.contentType === "KERNEL"}
        />
      )}

      {/* Fork tree */}
      {hasForkTree && (
        <ForkTree
          root={forkTree}
          currentSlug={tree.slug}
          ancestors={ancestors.map(a => ({
            ...a,
            contentType: a.contentType,
            forkDepth: 0,
            owner: { name: null, username: a.ownerUsername, image: null },
            _count: { forks: 0, likes: 0 },
            forks: [],
          }))}
        />
      )}

      {/* Extensions */}
      <ExtensionsPanel
        treeSlug={tree.slug}
        initialExtensions={tree.extensions.map((e) => ({
          id: e.id, type: e.type, title: e.title, description: e.description,
          url: e.url, imageUrl: e.imageUrl, author: e.author,
        }))}
        isOwner={isOwner}
      />

    </div>
  );
}
