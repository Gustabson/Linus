import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_BADGE } from "@/lib/constants";
import { FollowButton } from "@/components/profile/FollowButton";
import {
  GitFork, Heart, Users, BookOpen,
  Compass, Flame, Rss,
} from "lucide-react";
import type { ContentType } from "@prisma/client";

interface Props {
  userId: string;
  tab?:   string;
}

export async function SocialFeed({ userId, tab = "tendencias" }: Props) {
  const isTendencias = tab !== "siguiendo";

  const follows = await prisma.userFollow.findMany({
    where:  { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  const [feedRaw, trendingRaw, suggested] = await Promise.all([
    /* Feed — content from followed users */
    followingIds.length > 0
      ? prisma.documentTree.findMany({
          where:   { ownerId: { in: followingIds }, visibility: "PUBLIC" },
          include: {
            owner:  { select: { id: true, name: true, username: true, image: true } },
            _count: { select: { likes: true, forks: true, documents: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),

    /* Trending — best public content from everyone */
    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC", ownerId: { not: userId } },
      include: {
        owner:  { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { likes: true, forks: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),

    /* Suggested users to follow */
    prisma.user.findMany({
      where: {
        id:         { notIn: [userId, ...followingIds] },
        ownedTrees: { some: { visibility: "PUBLIC" } },
        username:   { not: null },
      },
      include: { _count: { select: { followers: true, ownedTrees: true } } },
      take: 5,
    }),
  ]);

  const trending = [...trendingRaw]
    .sort((a, b) => (b._count.likes * 2 + b._count.forks * 3) - (a._count.likes * 2 + a._count.forks * 3))
    .slice(0, 20);

  const suggestedSorted = [...suggested]
    .sort((a, b) => b._count.followers - a._count.followers);

  /* Active feed items */
  const items = isTendencias ? trending : feedRaw;

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Sticky tab bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-gray-50 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6">
        <div className="flex border-b border-gray-200">
          <TabLink
            href="/?tab=tendencias"
            active={isTendencias}
            icon={<Flame className="w-4 h-4" />}
            label="Tendencias"
          />
          <TabLink
            href="/?tab=siguiendo"
            active={!isTendencias}
            icon={<Rss className="w-4 h-4" />}
            label="Siguiendo"
          />
        </div>
      </div>

      {/* ── Main grid: feed + sidebar ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* ── Feed column ────────────────────────────────────────── */}
        <div className="min-w-0 space-y-3">
          {items.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            items.map((tree) => <TreeCard key={tree.id} tree={tree} />)
          )}
        </div>

        {/* ── Right sidebar ──────────────────────────────────────── */}
        {suggestedSorted.length > 0 && (
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Maestros para seguir
              </h3>
              <div className="space-y-3">
                {suggestedSorted.map((user) => (
                  <div key={user.id} className="flex items-center gap-2.5">
                    <Link href={`/${user.username ?? user.id}`} className="shrink-0">
                      {user.image ? (
                        <Image src={user.image} alt="" width={36} height={36} className="rounded-xl" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">
                          {(user.name ?? "?")[0]}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${user.username ?? user.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-green-700 truncate block transition-colors"
                      >
                        {user.name}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {user._count.ownedTrees} contenido{user._count.ownedTrees !== 1 ? "s" : ""}
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
              <Link
                href="/buscar"
                className="mt-4 flex items-center gap-1.5 text-sm text-green-700 hover:underline font-medium"
              >
                <Compass className="w-4 h-4" />
                Ver más maestros
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab link ──────────────────────────────────────────────────────────────────

function TabLink({
  href, active, icon, label,
}: {
  href: string; active: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-green-700 text-green-700"
          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: string }) {
  if (tab === "siguiendo") {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto">
          <Users className="w-7 h-7 text-gray-300" />
        </div>
        <div>
          <p className="font-bold text-gray-700 text-lg">Tu feed está vacío</p>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            Seguí a otros maestros para ver aquí su contenido más reciente.
          </p>
        </div>
        <Link
          href="/buscar"
          className="inline-flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-green-800 transition-colors"
        >
          <Compass className="w-4 h-4" />
          Buscar maestros
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center space-y-3">
      <BookOpen className="w-10 h-10 mx-auto text-gray-200" />
      <p className="text-gray-500 font-medium">Todavía no hay contenido público.</p>
      <Link
        href="/nuevo"
        className="inline-flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-green-800 transition-colors"
      >
        Crear el primero
      </Link>
    </div>
  );
}

// ── Tree card ─────────────────────────────────────────────────────────────────

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
    <div className="relative bg-white rounded-2xl border border-gray-200 hover:border-green-200 hover:shadow-md transition-all group p-6 flex flex-col gap-4">
      <Link
        href={`/${tree.owner.username ?? tree.owner.id}/${tree.slug}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={tree.title}
      />

      {/* Author */}
      <Link
        href={`/${tree.owner.username ?? tree.owner.id}`}
        className="relative z-10 flex items-center gap-2.5 w-fit hover:opacity-80 transition-opacity"
      >
        {tree.owner.image ? (
          <Image src={tree.owner.image} alt="" width={32} height={32} className="rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">
            {(tree.owner.name ?? "?")[0]}
          </div>
        )}
        <span className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">
          {tree.owner.name}
        </span>
      </Link>

      {/* Title + description */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors leading-snug line-clamp-2">
          {tree.title}
        </h3>
        {tree.description && (
          <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{tree.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
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
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{tree._count.likes}</span>
          <span className="flex items-center gap-1"><GitFork className="w-4 h-4" />{tree._count.forks}</span>
          {tree._count.documents !== undefined && (
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{tree._count.documents}</span>
          )}
        </div>
      </div>
    </div>
  );
}
