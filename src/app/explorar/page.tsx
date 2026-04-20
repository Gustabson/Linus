import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { GitFork, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const trees = await prisma.documentTree.findMany({
    where: {
      visibility: "PUBLIC",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      owner: { select: { name: true, image: true } },
      _count: { select: { forks: true, documents: true } },
    },
    orderBy: [{ isKernel: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Explorar currículos</h1>
        <p className="text-gray-500 mt-1">
          {trees.length} curriculum{trees.length !== 1 ? "s" : ""} disponibles
        </p>
      </div>

      {/* Search */}
      <form method="get" className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, tema, nivel..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </form>

      {/* Grid */}
      {trees.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No se encontraron currículos{q ? ` para "${q}"` : ""}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trees.map((tree) => (
            <Link
              key={tree.id}
              href={`/t/${tree.slug}`}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {tree.isKernel && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Kernel
                    </span>
                  )}
                  {tree.forkDepth > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      Nivel {tree.forkDepth}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2 mb-1">
                {tree.title}
              </h3>
              {tree.description && (
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                  {tree.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {tree._count.documents} doc{tree._count.documents !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {tree._count.forks} forks
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
