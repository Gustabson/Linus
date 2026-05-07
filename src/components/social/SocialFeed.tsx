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

  const [currentUser, postsRaw, suggested, featured] = await Promise.all([
    /* Current user info for composer avatar */
    prisma.user.findUnique({
      where:  { id: userId },
      select: USER_BASIC_SELECT,
    }),

    /* Initial posts (first page) */
    prisma.post.findMany({
      where: isTendencias
        ? {}
        : { authorId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      take: 71, // 70 to show + 1 for hasMore check
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
        likes:  { where: { userId }, select: { id: true } },
      },
    }),

    /* Suggested users to follow */
    prisma.user.findMany({
      where: {
        id:         { notIn: [userId, ...followingIds] },
        ownedTrees: { some: { visibility: "PUBLIC" } },
        username:   { not: null },
      },
      include: { _count: { select: { followers: true, ownedTrees: true } } },
      orderBy: { followers: { _count: "desc" } },
      take: 4,
    }),

    /* Featured public content (includes own content so sidebar shows even solo) */
    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC" },
      orderBy: { likes: { _count: "desc" } },
      take:    5,
      select: {
        id: true, slug: true, title: true, contentType: true,
        owner: { select: { username: true, name: true } },
        _count: { select: { likes: true, forks: true } },
      },
    }),
  ]);

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
    <div className="max-w-6xl mx-auto">

      {/* ── Sticky tab bar — centrada en todos los dispositivos ── */}
      <div className="sticky top-0 z-20 bg-bg border-b border-border mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex justify-center">
          <TabLink href="/?tab=tendencias" active={isTendencias}  icon={<Flame className="w-4 h-4" />} label="Tendencias" />
          <TabLink href="/?tab=siguiendo"  active={!isTendencias} icon={<Rss   className="w-4 h-4" />} label="Siguiendo"  />
        </div>
      </div>

      <div className={`flex flex-col items-stretch gap-8 lg:items-start ${hasSidebar ? "lg:flex-row lg:justify-center" : ""}`}>

        {/* ── Feed column — ancho máximo propio, centrado ── */}
        <div className="min-w-0 w-full lg:max-w-2xl lg:shrink-0">
          <PostFeed
            initialPosts={serializedPosts}
            initialCursor={nextCursor}
            tab={tab}
            currentUser={{
              id:       currentUser?.id ?? userId,
              name:     currentUser?.name ?? null,
              username: currentUser?.username ?? null,
              image:    currentUser?.image ?? null,
            }}
          />
        </div>

        {/* ── Right sidebar ───────────────────────────────────────── */}
        {hasSidebar && (
        <div className="hidden lg:block lg:sticky lg:top-20 w-[260px] shrink-0 space-y-4">

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
