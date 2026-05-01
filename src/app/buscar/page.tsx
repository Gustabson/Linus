import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { FollowButton } from "@/components/profile/FollowButton";

export const dynamic = "force-dynamic";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const session = await auth();

  const users = q.trim()
    ? await prisma.user.findMany({
        where: {
          username: { not: null },
          OR: [
            { name:     { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, name: true, username: true, image: true, bio: true,
          _count: { select: { followers: true, ownedTrees: true } },
          followers: session?.user?.id
            ? { where: { followerId: session.user.id }, select: { id: true } }
            : false,
        },
        take: 24,
        orderBy: { followers: { _count: "desc" } },
      })
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text">Buscar personas</h1>

      {/* Search form */}
      <form method="GET" action="/buscar" className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscá por nombre o @usuario..."
          autoFocus
          className="w-full pl-12 pr-4 py-3 border border-border rounded-2xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-surface"
        />
      </form>

      {/* Results */}
      {q && users.length === 0 && (
        <p className="text-center text-text-subtle py-12">
          No encontramos personas con &ldquo;{q}&rdquo;
        </p>
      )}

      {users.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((user) => {
            const isFollowing = Array.isArray(user.followers) && user.followers.length > 0;
            const isMe = session?.user?.id === user.id;
            return (
              <div key={user.id} className="relative bg-surface rounded-2xl border border-border hover:border-green-300 hover:shadow-sm transition-all p-4 flex items-center gap-3">
                <Link href={`/${user.username}`} className="absolute inset-0 rounded-2xl" aria-label={user.name ?? ""} />
                {user.image ? (
                  <Image src={user.image} alt="" width={44} height={44} className="rounded-full shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shrink-0">
                    {(user.name ?? "?")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{user.name}</p>
                  <p className="text-xs text-text-subtle">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{user.bio}</p>
                  )}
                  <p className="text-xs text-text-subtle mt-0.5">
                    {user._count.followers} seguidores · {user._count.ownedTrees} contenidos
                  </p>
                </div>
                {!isMe && (
                  <FollowButton
                    userId={user.id}
                    initialFollowing={isFollowing}
                    initialCount={user._count.followers}
                    isAuthenticated={!!session}
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!q && (
        <div className="text-center py-16 text-text-subtle">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Escribí un nombre para buscar</p>
        </div>
      )}
    </div>
  );
}
