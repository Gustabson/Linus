import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_BADGE } from "@/lib/constants";
import { FollowButton } from "@/components/profile/FollowButton";
import {
  GitFork, Heart, Plus, Users, Flame, BookOpen,
  ArrowRight, Rss,
} from "lucide-react";
import type { ContentType } from "@prisma/client";

interface Props {
  userId: string;
}

export async function SocialFeed({ userId }: Props) {
  // Who does this user follow?
  const follows = await prisma.userFollow.findMany({
    where:  { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  // Parallel queries
  const [feed, trendingRaw, suggested, me] = await Promise.all([
    // Recent public content from followed users
    followingIds.length > 0
      ? prisma.documentTree.findMany({
          where:   { ownerId: { in: followingIds }, visibility: "PUBLIC" },
          include: {
            owner:  { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, forks: true, documents: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),

    // Trending: recent public content sorted by engagement
    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC", ownerId: { not: userId } },
      include: {
        owner:  { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { likes: true, forks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),

    // Suggested follows: active users the current user doesn't follow
    prisma.user.findMany({
      where: {
        id:         { notIn: [userId, ...followingIds] },
        ownedTrees: { some: { visibility: "PUBLIC" } },
        username:   { not: null },
      },
      include: {
        _count: { select: { followers: true, ownedTrees: true } },
      },
      take: 15,
    }),

    // Current user's own stats
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        name: true, username: true, image: true,
        _count: { select: { ownedTrees: true, followers: true, following: true } },
      },
    }),
  ]);

  const trending = [...trendingRaw]
    .sort((a, b) => (b._count.likes * 2 + b._count.forks * 3) - (a._count.likes * 2 + a._count.forks * 3))
    .slice(0, 8);

  // Suggested: sort by follower count
  const suggestedSorted = [...suggested]
    .sort((a, b) => b._count.followers - a._count.followers)
    .slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="space-y-8 min-w-0">

          {/* Following feed */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Rss className="w-4 h-4 text-green-600" />
                De quienes seguís
              </h2>
              <Link href="/explorar" className="text-xs text-green-700 hover:underline">
                Explorar más →
              </Link>
            </div>

            {feed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm mb-1 font-medium">Tu feed está vacío</p>
                <p className="text-gray-400 text-xs mb-4">
                  Seguí a otros maestros para ver su contenido acá.
                </p>
                <Link
                  href="/explorar"
                  className="inline-flex items-center gap-1.5 text-sm bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  Descubrir maestros
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((tree) => (
                  <TreeCard key={tree.id} tree={tree} />
                ))}
              </div>
            )}
          </section>

          {/* Trending */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Tendencias
              </h2>
            </div>
            {trending.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía no hay contenido público.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trending.map((tree) => (
                  <TreeCard key={tree.id} tree={tree} compact />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-5 lg:sticky lg:top-24">

          {/* My stats */}
          {me && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4">
                {me.image ? (
                  <Image src={me.image} alt="" width={40} height={40} className="rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                    {(me.name ?? "?")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{me.name}</p>
                  {me.username && <p className="text-xs text-gray-400">@{me.username}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                <div>
                  <p className="font-bold text-gray-900 text-base">{me._count.ownedTrees}</p>
                  <p className="text-gray-400">contenidos</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{me._count.followers}</p>
                  <p className="text-gray-400">seguidores</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{me._count.following}</p>
                  <p className="text-gray-400">siguiendo</p>
                </div>
              </div>
              <Link
                href="/nuevo"
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white text-sm py-2 rounded-xl hover:bg-green-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear contenido
              </Link>
            </div>
          )}

          {/* Suggested follows */}
          {suggestedSorted.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Sugeridos para seguir</h3>
              <div className="space-y-3">
                {suggestedSorted.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Link href={`/u/${user.username ?? user.id}`} className="shrink-0">
                      {user.image ? (
                        <Image src={user.image} alt="" width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                          {(user.name ?? "?")[0]}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${user.username ?? user.id}`} className="text-sm font-medium text-gray-900 hover:text-green-700 truncate block">
                        {user.name}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {user._count.ownedTrees} contenidos · {user._count.followers} seguidores
                      </p>
                    </div>
                    <FollowButton
                      userId={user.id}
                      initialFollowing={false}
                      initialCount={user._count.followers}
                      isAuthenticated={true}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Accesos rápidos</h3>
            <div className="space-y-1">
              {[
                { href: "/explorar",  label: "Explorar kernels"  },
                { href: "/explorar?tipo=MODULE",   label: "Explorar módulos"  },
                { href: "/explorar?tipo=RESOURCE", label: "Explorar recursos" },
                { href: "/ledger",    label: "Ledger público"    },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-700 py-1.5 px-2 rounded-lg hover:bg-green-50 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tree card component ────────────────────────────────────────────────────────

type TreeWithMeta = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  updatedAt: Date;
  forkDepth: number;
  owner: { id: string; name: string | null; username: string | null; image: string | null };
  _count: { likes: number; forks: number; documents?: number };
};

function TreeCard({ tree, compact = false }: { tree: TreeWithMeta; compact?: boolean }) {
  const badge = CONTENT_TYPE_BADGE[tree.contentType];
  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all group p-4 flex flex-col gap-2">
      <Link href={`/t/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

      {/* Badge + fork */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
          {badge.icon}
          {badge.label}
        </span>
        {tree.forkDepth > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <GitFork className="w-3 h-3" /> Fork
          </span>
        )}
      </div>

      <h3 className={`font-semibold text-gray-900 group-hover:text-green-700 transition-colors ${compact ? "text-sm line-clamp-2" : "line-clamp-2"}`}>
        {tree.title}
      </h3>

      {!compact && tree.description && (
        <p className="text-gray-500 text-xs line-clamp-2">{tree.description}</p>
      )}

      {/* Author + stats */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
        <Link
          href={`/u/${tree.owner.username ?? tree.owner.id}`}
          className="relative z-10 flex items-center gap-1.5"
        >
          {tree.owner.image ? (
            <Image src={tree.owner.image} alt="" width={18} height={18} className="rounded-full" />
          ) : (
            <div className="w-[18px] h-[18px] rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-bold">
              {(tree.owner.name ?? "?")[0]}
            </div>
          )}
          <span className="text-xs text-gray-400 hover:text-green-700 transition-colors truncate max-w-[100px]">
            {tree.owner.name}
          </span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
          {!compact && tree._count.documents !== undefined && (
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{tree._count.documents}</span>
          )}
          {!compact && <span className="hidden sm:block">{formatDate(tree.updatedAt)}</span>}
        </div>
      </div>
    </div>
  );
}
