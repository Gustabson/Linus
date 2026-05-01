import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_BADGE } from "@/lib/constants";
import { FollowButton } from "@/components/profile/FollowButton";
import {
  GitFork, Heart, Plus, Users, Flame, BookOpen,
  ArrowRight, Rss, Compass, Sparkles,
} from "lucide-react";
import type { ContentType } from "@prisma/client";

interface Props {
  userId: string;
}

export async function SocialFeed({ userId }: Props) {
  const follows = await prisma.userFollow.findMany({
    where:  { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  const [feed, trendingRaw, suggested, me] = await Promise.all([
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

    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC", ownerId: { not: userId } },
      include: {
        owner:  { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { likes: true, forks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),

    prisma.user.findMany({
      where: {
        id:         { notIn: [userId, ...followingIds] },
        ownedTrees: { some: { visibility: "PUBLIC" } },
        username:   { not: null },
      },
      include: { _count: { select: { followers: true, ownedTrees: true } } },
      take: 15,
    }),

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
    .slice(0, 6);

  const suggestedSorted = [...suggested]
    .sort((a, b) => b._count.followers - a._count.followers)
    .slice(0, 5);

  const firstName = me?.name?.split(" ")[0] ?? "Maestro";

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {me?.image ? (
            <Image src={me.image} alt="" width={48} height={48} className="rounded-2xl ring-2 ring-green-100" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-700 text-xl font-bold">
              {firstName[0]}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-gray-900">
              Hola, {firstName} 👋
            </p>
            <p className="text-sm text-gray-500">
              Tu espacio para compartir y descubrir currículo educativo
            </p>
          </div>
        </div>
        <Link
          href="/nuevo"
          className="flex items-center gap-2 bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-green-800 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Crear contenido
        </Link>
      </div>

      {/* ── Main grid: feed + sidebar ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Feed column ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
              <Rss className="w-4 h-4 text-green-600" />
              De quienes seguís
            </h2>
            <Link href="/buscar" className="text-xs text-green-700 hover:underline font-medium">
              Descubrir maestros →
            </Link>
          </div>

          {feed.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tu feed está vacío</p>
                <p className="text-sm text-gray-400 mt-1">
                  Seguí a otros maestros para ver aquí su contenido más reciente.
                </p>
              </div>
              <Link
                href="/buscar"
                className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Compass className="w-4 h-4" />
                Buscar maestros
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((tree) => (
                <TreeCard key={tree.id} tree={tree} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-24">

          {/* My stats */}
          {me && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center gap-3">
                {me.image ? (
                  <Image src={me.image} alt="" width={36} height={36} className="rounded-xl" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                    {firstName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{me.name}</p>
                  {me.username && <p className="text-xs text-gray-400">@{me.username}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBubble value={me._count.ownedTrees} label="contenidos" />
                <StatBubble value={me._count.followers}  label="seguidores" />
                <StatBubble value={me._count.following}  label="siguiendo"  />
              </div>
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Ver mi espacio
              </Link>
            </div>
          )}

          {/* Trending — side by side with feed on desktop */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Tendencias
              </h3>
              <Link href="/explorar" className="text-xs text-green-700 hover:underline font-medium">
                Ver todo →
              </Link>
            </div>

            {trending.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">
                Todavía no hay contenido público.
              </p>
            ) : (
              <div className="space-y-1">
                {trending.map((tree) => (
                  <TrendingRow key={tree.id} tree={tree} />
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Accesos rápidos</h3>
            <div className="space-y-0.5">
              {[
                { href: "/explorar",               icon: "📚", label: "Explorar kernels"  },
                { href: "/explorar?tipo=MODULE",   icon: "🧩", label: "Explorar módulos"  },
                { href: "/explorar?tipo=RESOURCE", icon: "📎", label: "Explorar recursos" },
                { href: "/buscar",                 icon: "👥", label: "Buscar maestros"   },
                { href: "/ledger",                 icon: "🔏", label: "Ledger público"    },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-green-700 py-2 px-2 rounded-xl hover:bg-green-50 transition-colors"
                >
                  <span className="text-base leading-none">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Suggested follows */}
          {suggestedSorted.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Maestros para seguir</h3>
              <div className="space-y-3">
                {suggestedSorted.map((user) => (
                  <div key={user.id} className="flex items-center gap-2.5">
                    <Link href={`/${user.username ?? user.id}`} className="shrink-0">
                      {user.image ? (
                        <Image src={user.image} alt="" width={32} height={32} className="rounded-xl" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                          {(user.name ?? "?")[0]}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${user.username ?? user.id}`} className="text-sm font-medium text-gray-900 hover:text-green-700 truncate block transition-colors">
                        {user.name}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {user._count.ownedTrees} contenidos
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

        </div>
      </div>
    </div>
  );
}

// ── Stat bubble ────────────────────────────────────────────────────────────────

function StatBubble({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl py-2 px-1">
      <p className="font-bold text-gray-900 text-base">{value}</p>
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
    </div>
  );
}

// ── Tree card — full feed version ─────────────────────────────────────────────

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

function TreeCard({ tree }: { tree: TreeWithMeta }) {
  const badge = CONTENT_TYPE_BADGE[tree.contentType];
  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group p-5 flex flex-col gap-3">
      <Link href={`/${tree.owner.username ?? tree.owner.id}/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
          {badge.icon}
          {badge.label}
        </span>
        {tree.forkDepth > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <GitFork className="w-3 h-3" /> Fork
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors leading-snug line-clamp-2">
        {tree.title}
      </h3>

      {/* Description */}
      {tree.description && (
        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{tree.description}</p>
      )}

      {/* Author + stats */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
        <Link
          href={`/${tree.owner.username ?? tree.owner.id}`}
          className="relative z-10 flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {tree.owner.image ? (
            <Image src={tree.owner.image} alt="" width={20} height={20} className="rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-bold">
              {(tree.owner.name ?? "?")[0]}
            </div>
          )}
          <span className="text-xs text-gray-500 hover:text-green-700 transition-colors truncate max-w-[120px] font-medium">
            {tree.owner.name}
          </span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {tree._count.likes}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {tree._count.forks}
          </span>
          {tree._count.documents !== undefined && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {tree._count.documents}
            </span>
          )}
          <span className="hidden sm:block">{formatDate(tree.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Trending row — compact sidebar version ────────────────────────────────────

function TrendingRow({ tree }: { tree: TreeWithMeta }) {
  const badge = CONTENT_TYPE_BADGE[tree.contentType];
  return (
    <Link
      href={`/${tree.owner.username ?? tree.owner.id}/${tree.slug}`}
      className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      {/* Type dot */}
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
        tree.contentType === "KERNEL"   ? "bg-green-500"  :
        tree.contentType === "MODULE"   ? "bg-blue-500"   : "bg-amber-500"
      }`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 group-hover:text-green-700 transition-colors line-clamp-2 leading-snug">
          {tree.title}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span className={`${badge.cls} px-1.5 py-0.5 rounded-full text-[10px] font-medium`}>
            {badge.label}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3" />
            {tree._count.likes}
          </span>
          <span className="flex items-center gap-0.5">
            <GitFork className="w-3 h-3" />
            {tree._count.forks}
          </span>
        </div>
      </div>
    </Link>
  );
}
