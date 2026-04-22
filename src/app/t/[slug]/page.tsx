import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate, SECTION_LABELS } from "@/lib/utils";
import { GitFork, BookOpen, Shield, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ForkButton } from "@/components/trees/ForkButton";
import { LikeButton } from "@/components/trees/LikeButton";
import { ExtensionsPanel } from "@/components/trees/ExtensionsPanel";

export const dynamic = "force-dynamic";

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
      parentTree: { select: { slug: true, title: true } },
      forks: {
        where: { visibility: "PUBLIC" },
        take: 6,
        include: {
          owner: { select: { name: true, image: true } },
          _count: { select: { forks: true, likes: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sections: { select: { sectionType: true, isComplete: true } },
            },
          },
        },
      },
      extensions: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true, image: true } } },
      },
      _count: { select: { forks: true, likes: true } },
    },
  });

  if (!tree || tree.visibility === "PRIVATE") notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  const userLiked = session?.user?.id
    ? !!(await prisma.treeLike.findUnique({
        where: { treeId_userId: { treeId: tree.id, userId: session.user.id } },
      }))
    : false;

  const authorSlug = tree.owner.username ?? tree.owner.id;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      {tree.parentTree && (
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/t/${tree.parentTree.slug}`} className="hover:text-gray-900">
            {tree.parentTree.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{tree.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Author row */}
        <Link
          href={`/u/${authorSlug}`}
          className="flex items-center gap-3 group w-fit"
        >
          {tree.owner.image ? (
            <Image
              src={tree.owner.image}
              alt={tree.owner.name ?? ""}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-transparent group-hover:ring-green-300 transition-all"
            />
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
              {tree.isKernel && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
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
            <LikeButton
              treeSlug={tree.slug}
              initialLiked={userLiked}
              initialCount={tree._count.likes}
              isAuthenticated={!!session}
            />
            {!isOwner && session && (
              <ForkButton treeId={tree.id} treeTitle={tree.title} />
            )}
            {isOwner && (
              <Link
                href={`/t/${tree.slug}/nuevo`}
                className="flex items-center gap-1.5 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo doc
              </Link>
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
            {tree.documents.length} documento{tree.documents.length !== 1 ? "s" : ""}
          </span>
          <span>{formatDate(tree.createdAt)}</span>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Documentos</h2>
        {tree.documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Todavía no hay documentos.</p>
            {isOwner && (
              <Link href={`/t/${tree.slug}/nuevo`} className="mt-3 inline-block text-sm text-green-700 hover:underline">
                + Crear primer documento
              </Link>
            )}
          </div>
        ) : (
          tree.documents.map((doc) => {
            const latestVersion = doc.versions[0];
            const completeSections = latestVersion?.sections.filter((s) => s.isComplete).length ?? 0;
            const progress = Math.round((completeSections / 10) * 100);
            return (
              <Link
                key={doc.id}
                href={`/t/${tree.slug}/${doc.slug}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-all block group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 group-hover:text-green-700">
                    {doc.title}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {latestVersion?.sections.map((s) => (
                    <span key={s.sectionType} className={`text-xs px-2 py-0.5 rounded-full ${s.isComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {SECTION_LABELS[s.sectionType]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{progress}%</span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Extensions */}
      <ExtensionsPanel
        treeSlug={tree.slug}
        initialExtensions={tree.extensions.map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          description: e.description,
          url: e.url,
          imageUrl: e.imageUrl,
          author: e.author,
        }))}
        isOwner={isOwner}
      />

      {/* Forks */}
      {tree.forks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GitFork className="w-5 h-5" />
            Forks ({tree._count.forks})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tree.forks.map((fork) => (
              <Link key={fork.id} href={`/t/${fork.slug}`} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-all flex items-center gap-3">
                {fork.owner.image ? (
                  <Image src={fork.owner.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0">
                    {(fork.owner.name ?? "?")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{fork.title}</p>
                  <p className="text-xs text-gray-400">{fork.owner.name} · {fork._count.likes} ❤️ · {fork._count.forks} forks</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
