import { prisma } from "@/lib/prisma";
import { GitFork, BookOpen, Search, Heart, TrendingUp, Star, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import Image from "next/image";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { key: "trending", label: "Tendencia", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "likes", label: "Más likeados", icon: <Heart className="w-4 h-4" /> },
  { key: "forks", label: "Más forkeados", icon: <GitFork className="w-4 h-4" /> },
  { key: "new", label: "Más nuevos", icon: <Clock className="w-4 h-4" /> },
  { key: "kernel", label: "Kernels", icon: <Star className="w-4 h-4" /> },
];

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; author?: string }>;
}) {
  const { q, sort = "trending", author } = await searchParams;

  const trees = await prisma.documentTree.findMany({
    where: {
      visibility: "PUBLIC",
      ...(sort === "kernel" ? { isKernel: true } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(author ? {
        owner: {
          OR: [
            { name: { contains: author, mode: "insensitive" } },
            { username: { contains: author, mode: "insensitive" } },
          ],
        },
      } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { forks: true, likes: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Sort in memory — avoids Prisma relational orderBy issues
  const sorted = [...trees].sort((a, b) => {
    if (sort === "likes") return b._count.likes - a._count.likes;
    if (sort === "forks") return b._count.forks - a._count.forks;
    if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "kernel") return (b.isKernel ? 1 : 0) - (a.isKernel ? 1 : 0);
    // trending = weighted score
    return (b._count.likes * 2 + b._count.forks * 3) - (a._count.likes * 2 + a._count.forks * 3);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Explorar</h1>
        <p className="text-gray-500 mt-1">
          {sorted.length} currículo{sorted.length !== 1 ? "s" : ""} disponibles
        </p>
      </div>

      {/* Search + author filter */}
      <form method="get" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre del currículo..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="author"
            defaultValue={author}
            placeholder="Buscar por autor..."
            className="w-full sm:w-48 pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <input type="hidden" name="sort" value={sort} />
        <button
          type="submit"
          className="bg-green-700 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-green-800"
        >
          Buscar
        </button>
      </form>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <a
            key={opt.key}
            href={`/explorar?sort=${opt.key}${q ? `&q=${q}` : ""}${author ? `&author=${author}` : ""}`}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
              sort === opt.key
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            {opt.icon}
            {opt.label}
          </a>
        ))}
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No se encontraron currículos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((tree) => (
            <Link
              key={tree.id}
              href={`/t/${tree.slug}`}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group flex flex-col"
            >
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                {tree.isKernel && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    Kernel
                  </span>
                )}
                {tree.forkDepth > 0 && (
                  <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    Nivel {tree.forkDepth}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2 mb-1 flex-1">
                {tree.title}
              </h3>
              {tree.description && (
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                  {tree.description}
                </p>
              )}

              {/* Author */}
              <Link
                href={`/u/${tree.owner.username ?? tree.owner.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 mb-3 group/author"
              >
                {tree.owner.image ? (
                  <Image
                    src={tree.owner.image}
                    alt={tree.owner.name ?? ""}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                    {(tree.owner.name ?? "?")[0]}
                  </div>
                )}
                <span className="text-xs text-gray-400 group-hover/author:text-green-700 transition-colors">
                  {tree.owner.name}
                </span>
              </Link>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {tree._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {tree._count.forks}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {tree._count.documents}
                </span>
                <span>{formatDate(tree.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
