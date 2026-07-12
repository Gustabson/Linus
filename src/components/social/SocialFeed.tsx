import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import Link from "next/link";
import Image from "next/image";
import { Flame, Rss, Users, Compass, Star, GitFork, Heart, ArrowUpRight } from "lucide-react";
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
          take: 3,
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
    .slice(0, 3);

  const POSTS_PER_PAGE = 70;
  const hasMore      = postsRaw.length > POSTS_PER_PAGE;
  const posts        = hasMore ? postsRaw.slice(0, POSTS_PER_PAGE) : postsRaw;
  const nextCursor   = hasMore ? posts[posts.length - 1].createdAt.toISOString() : null;

  // Serialize dates for client; guests have no likes field — inject empty array
  const serializedPosts: PostData[] = posts.map((p) => ({
    ...p,
    likes:     (p as { likes?: { id: string }[] }).likes ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: undefined as never,
  }));

  const hasSidebar = suggested.length > 0 || featured.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1060px]">

      {/* ── Guest banner ─────────────────────────────────────────── */}
      {isGuest && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3.5 flex-wrap">
          <p className="text-sm text-text-muted">
            Iniciá sesión para dar likes, comentar y seguir a otros.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
            <span className="text-border">|</span>
            <Link href="/login" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-h">
              Crear cuenta
            </Link>
          </div>
        </div>
      )}

      {/* Sticky tab switcher */}
      <div className="sticky top-0 z-20 mb-5 bg-bg/95 py-3 backdrop-blur-sm">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm">
          <TabLink href="/?tab=tendencias" active={isTendencias}  icon={<Flame className="w-4 h-4" />} label="Tendencias" />
          {!isGuest && (
            <TabLink href="/?tab=siguiendo" active={!isTendencias} icon={<Rss className="w-4 h-4" />} label="Siguiendo" />
          )}
        </div>
      </div>

      <div className={hasSidebar
        ? "grid items-start gap-6 xl:grid-cols-[minmax(0,680px)_260px] xl:justify-center"
        : "mx-auto w-full max-w-[700px]"
      }>

        {/* ── Feed — full width hasta xl, luego flex-1 ── */}
        <div className="min-w-0 w-full">
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
        <aside className="hidden space-y-5 xl:sticky xl:top-20 xl:block">

          {/* Personas para seguir */}
          {suggested.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
                Personas para seguir
              </h2>
              <div className="space-y-4">
                {suggested.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Link href={`/${user.username ?? user.id}`} className="shrink-0">
                      {user.image ? (
                        <Image src={user.image} alt="" width={38} height={38} className="rounded-xl" />
                      ) : (
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
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
                className="mt-5 flex items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <span className="flex items-center gap-1.5"><Compass className="h-4 w-4" /> Ver más personas</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
          )}

          {/* Contenido destacado */}
          {featured.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Star className="h-4 w-4" /></span>
                Contenido destacado
              </h2>
              <div className="space-y-2.5">
                {featured.map((tree) => {
                  const ts = CONTENT_TYPE_STYLE[tree.contentType];
                  return (
                    <Link
                      key={tree.id}
                      href={`/${tree.owner.username}/${tree.slug}`}
                      className="group block rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-bg"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ts.iconBgCls}`}>{ts.iconLg}</span>
                        <div className="min-w-0 flex-1">
                          <span className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ts.badgeCls}`}>{ts.label}</span>
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-text transition-colors group-hover:text-primary">{tree.title}</p>
                          <p className="mt-1 truncate text-xs text-text-muted">{tree.owner.name}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3 pl-12 text-xs text-text-subtle">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/explorar"
                className="mt-4 flex items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <span className="flex items-center gap-1.5"><Compass className="h-4 w-4" /> Explorar todo</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
          )}

        </aside>
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
      className={`flex min-w-[126px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:bg-bg hover:text-text"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
