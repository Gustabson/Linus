import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { GitFork, BookOpen, Shield, ChevronRight, Plus, Settings, GitPullRequest, Eye } from "lucide-react";
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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { title: true, description: true, contentType: true, owner: { select: { name: true } } },
  });
  if (!tree) return {};
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true, bio: true } },
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

  if (!tree) notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  // Whether the tree has at least one document with a DRAFT (unpublished changes)
  const hasChanges = tree.documents.some((doc) => doc.versions[0]?.status === "DRAFT");

  // MODULE / RESOURCE are single-document entities — the tree page is invisible to users.
  // Redirect straight to the document editor (auto-created on tree creation).
  if (tree.contentType !== "KERNEL" && tree.documents.length > 0) {
    redirect(`/t/${tree.slug}/${tree.documents[0].slug}`);
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

  // Build ancestor chain (walk up to find root)
  const ancestors: { id: string; slug: string; title: string; contentType: string }[] = [];
  let current = tree.parentTree as typeof tree.parentTree & { parentTreeId?: string | null } | null;
  while (current) {
    ancestors.unshift({ id: current.id, slug: current.slug, title: current.title, contentType: current.contentType ?? "KERNEL" });
    if (!current.parentTreeId) break;
    current = await prisma.documentTree.findUnique({
      where: { id: current.parentTreeId },
      select: { id: true, slug: true, title: true, contentType: true, parentTreeId: true },
    }) as typeof current;
  }

  // Build fork tree from current tree (3 levels deep)
  const forkTree = await fetchForkSubtree(tree.id, 3);
  const hasForkTree = forkTree.forks.length > 0 || ancestors.length > 0;

  const authorSlug = tree.owner.username ?? tree.owner.id;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      {ancestors.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          {ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-4 h-4" />}
              <Link href={`/t/${a.slug}`} className="hover:text-gray-900">
                {a.title}
              </Link>
            </span>
          ))}
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{tree.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Author row */}
        <Link href={`/u/${authorSlug}`} className="flex items-center gap-3 group w-fit">
          {tree.owner.image ? (
            <Image src={tree.owner.image} alt={tree.owner.name ?? ""} width={40} height={40}
              className="rounded-full ring-2 ring-transparent group-hover:ring-green-300 transition-all" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold ring-2 ring-transparent group-hover:ring-green-300 transition-all">
              {(tree.owner.name ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 group-hover:text-green-700 transition-colors text-sm">
              {tree.owner.name}
            </p>
            {tree.owner.username && (
              <p className="text-xs text-gray-400">@{tree.owner.username}</p>
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
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  Fork nivel {tree.forkDepth}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{tree.title}</h1>
            {tree.description && (
              <p className="text-gray-500">{tree.description}</p>
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
                className="flex items-center gap-1.5 text-sm text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                <GitPullRequest className="w-4 h-4" />
                Propuesta abierta
              </Link>
            )}
            {isOwner && !tree.parentTreeId && openProposalsCount > 0 && (
              <Link href="/propuestas"
                className="flex items-center gap-2 text-sm text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                <GitPullRequest className="w-4 h-4" />
                {openProposalsCount} propuesta{openProposalsCount !== 1 ? "s" : ""}
              </Link>
            )}
            {/* Preview — always visible for kernels (shows full read-only view) */}
            <Link href={`/t/${tree.slug}/preview`}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Eye className="w-4 h-4" />
              Preview
            </Link>
            {isOwner && (
              <>
                <Link href={`/t/${tree.slug}/configuracion`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Link>
                <Link href={`/t/${tree.slug}/nuevo`}
                  className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors ${style.btnCls}`}>
                  <Plus className="w-4 h-4" />
                  {KERNEL_NEW_DOC_LABEL}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-sm text-gray-500 pt-2 border-t border-gray-100 flex-wrap">
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
                initialHash={tree.contentHash ?? null}
                hasChanges={hasChanges}
              />
            </div>
          )}
        </div>

        {/* ── Documents (inside the card — kernel + docs = one visual unit) ── */}
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Documentos</p>
        <QuickAddDocument
          treeSlug={tree.slug}
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
            owner: { name: null, username: null, image: null },
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

      {/* Ledger */}
      <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-green-600" />
        Todos los cambios están en el{" "}
        <Link href={`/ledger?tree=${tree.id}`} className="text-green-700 hover:underline">
          ledger criptográfico
        </Link>.
      </div>
    </div>
  );
}
