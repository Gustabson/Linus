import { prisma } from "@/lib/prisma";
import { GitFork, Heart, BookOpen, Cpu, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KernelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const kernels = await prisma.documentTree.findMany({
    where: {
      isKernel: true,
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
      owner: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { forks: true, likes: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by fork count (most forked = most adopted)
  const sorted = [...kernels].sort(
    (a, b) => b._count.forks - a._count.forks
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Cpu className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kernels</h1>
            <p className="text-gray-500 text-sm">
              Currículos base creados por escuelas e instituciones. Forkeálos para adaptarlos a tu contexto.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form method="get" className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar kernels..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <button
          type="submit"
          className="bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-green-800 transition-colors"
        >
          Buscar
        </button>
        <Link
          href="/nuevo"
          className="flex items-center gap-1.5 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors"
        >
          <Cpu className="w-4 h-4" />
          Crear kernel
        </Link>
      </form>

      {/* Stats bar */}
      <div className="bg-green-50 rounded-2xl px-5 py-4 flex items-center gap-6 flex-wrap">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-800">{sorted.length}</p>
          <p className="text-xs text-green-600">kernels públicos</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-800">
            {sorted.reduce((acc, k) => acc + k._count.forks, 0)}
          </p>
          <p className="text-xs text-green-600">forks totales</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-800">
            {sorted.reduce((acc, k) => acc + k._count.likes, 0)}
          </p>
          <p className="text-xs text-green-600">likes totales</p>
        </div>
      </div>

      {/* Kernels grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Cpu className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Todavía no hay kernels públicos.</p>
          <p className="text-gray-400 text-sm mt-1">¡Sé el primero en crear el kernel de tu escuela!</p>
          <Link
            href="/nuevo"
            className="inline-flex items-center gap-2 mt-4 bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-green-800 transition-colors"
          >
            <Cpu className="w-4 h-4" />
            Crear kernel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sorted.map((kernel, i) => (
            <div
              key={kernel.id}
              className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:border-green-300 hover:shadow-sm transition-all group flex flex-col gap-4"
            >
              <Link href={`/t/${kernel.slug}`} className="absolute inset-0 rounded-2xl" aria-label={kernel.title} />

              {/* Rank + badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Kernel oficial
                </span>
              </div>

              {/* Title + description */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2">
                  {kernel.title}
                </h2>
                {kernel.description && (
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{kernel.description}</p>
                )}
              </div>

              {/* Author */}
              <Link
                href={`/u/${kernel.owner.username ?? kernel.owner.id}`}
                className="relative z-10 flex items-center gap-2 w-fit"
              >
                {kernel.owner.image ? (
                  <Image src={kernel.owner.image} alt="" width={24} height={24} className="rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                    {(kernel.owner.name ?? "?")[0]}
                  </div>
                )}
                <span className="text-sm text-gray-500 hover:text-green-700 transition-colors">
                  {kernel.owner.name}
                  {kernel.owner.username && (
                    <span className="text-gray-400 ml-1">@{kernel.owner.username}</span>
                  )}
                </span>
              </Link>

              {/* Stats */}
              <div className="flex items-center gap-5 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-green-600" />
                  <strong className="text-gray-900">{kernel._count.forks}</strong> forks
                </span>
                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-400" />
                  <strong className="text-gray-900">{kernel._count.likes}</strong> likes
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <strong className="text-gray-900">{kernel._count.documents}</strong> docs
                </span>
                <span className="ml-auto text-xs text-gray-400">{formatDate(kernel.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
