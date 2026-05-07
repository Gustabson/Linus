import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import Link from "next/link";
import Image from "next/image";
import { Flame, Rss, Users, Compass, Star, GitFork, Heart } from "lucide-react";
import { FollowButton } from "@/components/profile/FollowButton";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import { PostFeed } from "./PostFeed";
import type { PostData } from "./PostCard";

interface Props {
  userId?: string | null;
  tab?:    string;
}

export async function SocialFeed({ userId = null, tab = "tendencias" }: Props) {
  const isGuest       = !userId;
  // Guests only see tendencias (can't follow anyone)
  const isTendencias  = isGuest || tab !== "siguiendo";
  const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const followingIds = userId
    ? (await prisma.userFollow.findMany({
        where:  { followerId: userId },
        select: { followingId: true },
      })).map((f) => f.followingId)
    : [];

  const [currentUser, postsRaw, suggested, featuredCandidates] = await Promise.all([
    /* Current user info for composer avatar */
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: USER_BASIC_SELECT })
      : Promise.resolve(null),

    /* Initial posts (first page) */
    prisma.post.findMany({
      where: isTendencias
        ? {}
        : { authorId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      take: 71,
      include: {
        author: { select: USER_BASIC_SELECT },
        tree: {
          select: {
            id: true, slug: true, title: true, description: true,
            contentType: true, forkDepth: true,
            owner: { select: { username: true, name: true } },
            _count: { select: { likes: true, forks: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    }),

    /* Suggested users to follow — skip for guests */
    userId
      ? prisma.user.findMany({
          where: {
            id:         { notIn: [userId, ...followingIds] },
            ownedTrees: { some: { visibility: "PUBLIC" } },
            username:   { not: null },
          },
          include: { _count: { select: { followers: true, ownedTrees: true } } },
          orderBy: { followers: { _count: "desc" } },
          take: 4,
        })
      : Promise.resolve([]),

    /* Featured: top 30 by total likes (pre-filter), re-ranked by recent activity */
    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC" },
      orderBy: { likes: { _count: "desc" } },
      take:    30,
      select: {
        id: true, slug: true, title: true, contentType: true,
        owner:  { select: { username: true, name: true } },
        // Total counts (tiebreaker)
        _count: { select: { likes: true, forks: true } },
        // Recent activity: likes and forks in the last 2 weeks
        likes: { where: { createdAt: { gte: TWO_WEEKS_AGO } }, select: { id: true } },
        forks: { where: { createdAt: { gte: TWO_WEEKS_AGO } }, select: { id: true } },
      },
    }),
  ]);

  // ── Featured content scoring ────────────────────────────────────────────────
  // Primary:   recent activity in the last 2 weeks (likes + forks×2)
  //            A 3-year-old post with 1000 recent forks + 2000 recent likes
  //            will easily outrank any new post with little activity.
  // Tiebreaker: lifetime score × 0.1 so popular classics win ties.
  const featured = featuredCandidates
    .map((tree) => {
      const recentScore = tree.likes.length + tree.forks.length * 2;
      const totalScore  = tree._count.likes  + tree._count.forks  * 2;
      const score       = recentScore + totalScore * 0.1;
      return { ...tree, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);

  const POSTS_PER_PAGE = 70;
  const hasMore      = postsRaw.length > POSTS_PER_PAGE;
  const posts        = hasMore ? postsRaw.slice(0, POSTS_PER_PAGE) : postsRaw;
  const nextCursor   = hasMore ? posts[posts.length - 1].createdAt.toISOString() : null;

  // Serialize dates for client
  const serializedPosts: PostData[] = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: undefined as never,
  }));

  const hasSidebar = suggested.length > 0 || featured.length > 0;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Guest banner ─────────────────────────────────────────── */}
      {isGuest && (
        <div className="mb-4 flex items-center justify-between gap-4 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3.5 flex-wrap">
          <p className="text-sm text-text-muted">
            Iniciá sesión para dar likes, comentar y seguir a otros.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
            <span className="text-border">|</span>
            <Link href="/login" className="text-sm font-semibold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-h transition-colors">
              Crear cuenta
            </Link>
          </div>
        </div>
      )}

      {/* ── Sticky tab bar — centrada en todos los dispositivos ── */}
      <div className="sticky top-0 z-20 bg-bg border-b border-border mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex justify-center">
          <TabLink href="/?tab=tendencias" active={isTendencias}  icon={<Flame className="w-4 h-4" />} label="Tendencias" />
          {!isGuest && (
            <TabLink href="/?tab=siguiendo" active={!isTendencias} icon={<Rss className="w-4 h-4" />} label="Siguiendo" />
          )}
        </div>
      </div>

      {/* xl+ → flex row (sidebar visible); por debajo → columna, feed centered */}
      <div className={hasSidebar ? "xl:flex xl:items-start xl:gap-10" : ""}>

        {/* ── Feed — full width hasta xl, luego flex-1 ── */}
        <div className={`min-w-0 ${hasSidebar ? "xl:flex-1" : "max-w-2xl mx-auto w-full"}`}>
          <PostFeed
            initialPosts={serializedPosts}
            initialCursor={nextCursor}
            tab={tab}
            currentUser={currentUser ? {
              id:       currentUser.id,
              name:     currentUser.name     ?? null,
              username: currentUser.username ?? null,
              image:    currentUser.image    ?? null,
            } : null}
          />
        </div>

        {/* ── Right sidebar ───────────────────────────────────────── */}
        {hasSidebar && (
        <div className="hidden xl:block xl:sticky xl:top-20 w-[260px] shrink-0 space-y-4">

          {/* Personas para seguir */}
          {suggested.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Personas para seguir
              </h3>
              <div className="space-y-3">
                {suggested.map((user) => (
                  <div key={user.id} className="flex items-center gap-2.5">
                    <Link href={`/${user.username ?? user.id}`} className="shrink-0">
                      {user.image ? (
                        <Image src={user.image} alt="" width={34} height={34} className="rounded-xl" />
                      ) : (
                        <div className="w-[34px] h-[34px] rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {(user.name ?? "?")[0]}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${user.username ?? user.id}`}
                        className="text-sm font-semibold text-text hover:text-primary truncate block transition-colors"
                      >
                        {user.name}
                      </Link>
                      <p className="text-xs text-text-subtle">
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
                className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <Compass className="w-4 h-4" />
                Ver más personas
              </Link>
            </div>
          )}

          {/* Contenido destacado */}
          {featured.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Contenido destacado
              </h3>
              <div className="space-y-2">
                {featured.map((tree) => {
                  const ts = CONTENT_TYPE_STYLE[tree.contentType];
                  return (
                    <Link
                      key={tree.id}
                      href={`/${tree.owner.username}/${tree.slug}`}
                      className="block rounded-xl p-2.5 hover:bg-bg transition-colors group"
                    >
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium mb-1 ${ts.badgeCls}`}>
                        {ts.label}
                      </span>
                      <p className={`text-sm font-medium ${ts.textCls} group-hover:underline line-clamp-2 leading-snug`}>
                        {tree.title}
                      </p>
                      <p className="text-xs text-text-subtle mt-0.5">{tree.owner.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-subtle">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/explorar"
                className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <Compass className="w-4 h-4" />
                Explorar todo
              </Link>
            </div>
          )}

        </div>
        )}
      </div>
    </div>
  );
}

// ── Tab link ──────────────────────────────────────────────────────────────────

function TabLink({ href, active, icon, label }: {
  href: string; active: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-text-muted hover:text-text hover:border-gray-300"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
