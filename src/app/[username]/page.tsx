import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { GitFork, Heart, MapPin, Globe, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { FollowButton } from "@/components/profile/FollowButton";
import { CONTENT_TYPE_BADGE, CONTENT_TYPE_STYLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where:  { username },
    select: { name: true, bio: true },
  });
  if (!user) return {};
  return {
    title:       user.name ?? username,
    description: user.bio ?? `Perfil de ${user.name ?? username} en EduHub`,
    openGraph:   { title: user.name ?? username, description: user.bio ?? undefined },
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      ownedTrees: {
        where: { visibility: "PUBLIC" },
        include: {
          _count: { select: { forks: true, likes: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          ownedTrees: true,
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) notFound();

  const isOwn = session?.user?.id === user.id;

  // Check if the current user follows this profile
  const isFollowing = session?.user?.id && !isOwn
    ? !!(await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
      }))
    : false;

  const totalForks = user.ownedTrees.reduce((acc, t) => acc + t._count.forks, 0);
  const totalLikes = user.ownedTrees.reduce((acc, t) => acc + t._count.likes, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile header */}
      <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            {user.image ? (
              <Image src={user.image} alt={user.name ?? ""} width={96} height={96} className="rounded-full" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                {(user.name ?? "?")[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-text">{user.name}</h1>
                {user.username && (
                  <p className="text-text-subtle text-sm">@{user.username}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOwn && (
                  <EditProfileButton user={{
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    bio: user.bio,
                    website: user.website,
                    location: user.location,
                  }} />
                )}
                {!isOwn && (
                  <FollowButton
                    userId={user.id}
                    initialFollowing={!!isFollowing}
                    initialCount={user._count.followers}
                    isAuthenticated={!!session}
                  />
                )}
              </div>
            </div>

            {user.bio && (
              <p className="text-text-muted leading-relaxed text-base">{user.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-text-muted">
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {user.location}
                </span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="w-4 h-4" />
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Se unió {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-subtle">
          {[
            { label: "Seguidores", value: user._count.followers },
            { label: "Siguiendo",  value: user._count.following  },
            { label: "Forks recibidos", value: totalForks },
            { label: "Likes recibidos", value: totalLikes },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xs text-text-subtle mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-text">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text">Contenido público</h2>
        {user.ownedTrees.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center text-text-subtle">
            <p>Este usuario todavía no tiene contenido público.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.ownedTrees.map((tree) => {
              const badge = CONTENT_TYPE_BADGE[tree.contentType] ?? CONTENT_TYPE_BADGE.KERNEL;
              const ts    = CONTENT_TYPE_STYLE[tree.contentType];
              return (
                <Link key={tree.id} href={`/${user.username}/${tree.slug}`}
                  className={`bg-surface rounded-2xl border border-border p-6 ${ts.hoverBorderCls} hover:shadow-md transition-all group block`}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                    {tree.forkDepth > 0 && (
                      <span className="bg-border-subtle text-text-muted text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        Fork
                      </span>
                    )}
                  </div>
                  <h3 className={`text-base font-bold text-text ${ts.groupHoverTextCls} transition-colors mb-2 line-clamp-2`}>
                    {tree.title}
                  </h3>
                  {tree.description && (
                    <p className="text-text-muted text-sm line-clamp-2 mb-4 leading-relaxed">{tree.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-text-subtle pt-3 border-t border-border-subtle">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {tree._count.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" /> {tree._count.forks}
                    </span>
                    <span className="ml-auto text-xs">{formatDate(tree.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
