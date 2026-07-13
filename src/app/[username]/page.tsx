import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  FileText,
  GitFork,
  Globe,
  Heart,
  LayoutGrid,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileContentGrid, type ProfileTree } from "@/components/profile/ProfileContentGrid";
import { ProfileFeed } from "@/components/profile/ProfileFeed";
import type { PostData } from "@/components/social/PostCard";
import { auth } from "@/lib/auth";
import { USER_BASIC_SELECT } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDate, safeUrl } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, bio: true },
  });
  if (!user) return {};
  return {
    title: user.name ?? username,
    description: user.bio ?? `Perfil de ${user.name ?? username} en LINUG`,
    openGraph: { title: user.name ?? username, description: user.bio ?? undefined },
  };
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "contenido" ? "contenido" : "publicaciones";
  const session = await auth();
  const currentUserId = session?.user?.id ?? "__anonymous__";

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      ownedTrees: {
        where: { visibility: "PUBLIC" },
        include: {
          _count: { select: { forks: true, likes: true } },
          likes: { where: { userId: currentUserId }, select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: { ownedTrees: true, followers: true, following: true },
      },
    },
  });

  if (!user) notFound();

  const isOwn = session?.user?.id === user.id;
  const isFollowing = session?.user?.id && !isOwn
    ? !!(await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
      }))
    : false;

  const totalForks = user.ownedTrees.reduce((total, tree) => total + tree._count.forks, 0);
  const totalLikes = user.ownedTrees.reduce((total, tree) => total + tree._count.likes, 0);

  const LIMIT = 20;
  const rawPosts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: LIMIT + 1,
    include: {
      author: { select: USER_BASIC_SELECT },
      tree: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          contentType: true,
          forkDepth: true,
          owner: { select: { username: true, name: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
  });

  const hasMorePosts = rawPosts.length > LIMIT;
  if (hasMorePosts) rawPosts.pop();
  const initialPosts = rawPosts as unknown as PostData[];
  const initialCursor = hasMorePosts
    ? rawPosts[rawPosts.length - 1].createdAt.toISOString()
    : null;

  const currentUser = session?.user?.id
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        username: session.user.username ?? null,
        image: isOwn ? (user.image ?? null) : (session.user.image ?? null),
      }
    : null;

  const profileTrees: ProfileTree[] = user.ownedTrees.map(({ likes, ...tree }) => ({
    ...tree,
    updatedAt: tree.updatedAt.toISOString(),
    initialLiked: likes.length > 0,
  }));

  const profileStats = [
    { label: "Seguidores", value: user._count.followers, icon: Users },
    { label: "Siguiendo", value: user._count.following, icon: UserPlus },
    { label: "Forks recibidos", value: totalForks, icon: GitFork },
    { label: "Likes recibidos", value: totalLikes, icon: Heart },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? `@${username}`}
                  width={104}
                  height={104}
                  className="h-[104px] w-[104px] rounded-full object-cover ring-4 ring-bg shadow-sm"
                />
              ) : (
                <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-bg">
                  {(user.name ?? username)[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold tracking-tight text-text sm:text-3xl">{user.name ?? username}</h1>
                  <p className="mt-0.5 text-sm font-medium text-text-subtle">@{username}</p>
                </div>
                <div className="shrink-0">
                  {isOwn ? (
                    <EditProfileButton user={{
                      id: user.id,
                      name: user.name,
                      username: user.username,
                      bio: user.bio,
                      website: user.website,
                      location: user.location,
                      image: user.image,
                    }} />
                  ) : (
                    <FollowButton
                      userId={user.id}
                      initialFollowing={!!isFollowing}
                      initialCount={user._count.followers}
                      isAuthenticated={!!session}
                    />
                  )}
                </div>
              </div>

              {user.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">{user.bio}</p>
              ) : isOwn ? (
                <p className="mt-4 text-sm italic text-text-subtle">Agregá una presentación para que la comunidad te conozca mejor.</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
                {user.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-text-subtle" />{user.location}</span>
                )}
                {user.website && (
                  <a
                    href={safeUrl(user.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="max-w-56 truncate">{user.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-text-subtle" />Se unió {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2.5 border-t border-border-subtle pt-5 lg:grid-cols-4">
            {profileStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-bg/70 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <strong className="block text-xl leading-none text-text">{value}</strong>
                  <span className="mt-1 block text-[11px] font-medium leading-tight text-text-subtle">{label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav aria-label="Secciones del perfil" className="sticky top-2 z-20 flex rounded-2xl border border-border bg-surface p-1.5 shadow-sm">
        {([
          { key: "publicaciones", label: "Publicaciones", icon: FileText, count: null },
          { key: "contenido", label: "Contenido", icon: LayoutGrid, count: user.ownedTrees.length },
        ] as const).map(({ key, label, icon: Icon, count }) => {
          const active = activeTab === key;
          const href = key === "publicaciones" ? `/${username}` : `/${username}?tab=${key}`;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none ${active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-text"}`}
            >
              <Icon className="h-4 w-4" /> {label}
              {count !== null && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary/10 text-primary" : "bg-border-subtle text-text-subtle"}`}>{count}</span>}
            </Link>
          );
        })}
      </nav>

      <div>
        {activeTab === "publicaciones" && (
          <ProfileFeed
            username={username}
            initialPosts={initialPosts}
            initialCursor={initialCursor}
            currentUser={currentUser}
            isOwnProfile={isOwn}
          />
        )}

        {activeTab === "contenido" && (
          <ProfileContentGrid
            trees={profileTrees}
            ownerPath={username}
            isAuthenticated={!!session?.user?.id}
          />
        )}
      </div>
    </div>
  );
}
