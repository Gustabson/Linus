import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Flame, Rss, Users, Compass } from "lucide-react";
import { FollowButton } from "@/components/profile/FollowButton";
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

  const [currentUser, postsRaw, suggested] = await Promise.all([
    /* Current user info for composer avatar */
    prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, username: true, image: true },
    }),

    /* Initial posts (first page) */
    prisma.post.findMany({
      where: isTendencias
        ? {}
        : { authorId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      take: 21,
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
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
      take: 5,
    }),
  ]);

  const hasMore      = postsRaw.length > 20;
  const posts        = hasMore ? postsRaw.slice(0, 20) : postsRaw;
  const nextCursor   = hasMore ? posts[posts.length - 1].createdAt.toISOString() : null;

  // Serialize dates for client
  const serializedPosts: PostData[] = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: undefined as never,
  }));

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Sticky tab bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-bg -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6">
        <div className="flex border-b border-border">
          <TabLink href="/?tab=tendencias" active={isTendencias}   icon={<Flame className="w-4 h-4" />} label="Tendencias" />
          <TabLink href="/?tab=siguiendo"  active={!isTendencias}  icon={<Rss   className="w-4 h-4" />} label="Siguiendo"  />
        </div>
      </div>

      {/* ── Main: feed + right sidebar ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Feed column */}
        <div className="min-w-0">
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

        {/* Right sidebar — suggested teachers */}
        {suggested.length > 0 && (
          <div className="lg:sticky lg:top-20 space-y-4">
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
                        <Image src={user.image} alt="" width={36} height={36} className="rounded-xl" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
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
