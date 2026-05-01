import { prisma } from "@/lib/prisma";
import { GitFork, BookOpen, Search, Heart, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { CONTENT_TYPE_BADGE, CONTENT_TYPE_STYLE, CONTENT_TABS } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { key: "trending", label: "Tendencia",    icon: <TrendingUp className="w-4 h-4" /> },
  { key: "likes",    label: "Más likeados", icon: <Heart className="w-4 h-4" />      },
  { key: "forks",    label: "Más forkeados",icon: <GitFork className="w-4 h-4" />    },
  { key: "new",      label: "Más nuevos",   icon: <Clock className="w-4 h-4" />      },
];

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; tipo?: string }>;
}) {
  const { q, sort = "trending", tipo = "KERNEL" } = await searchParams;
  const contentType = (["KERNEL", "MODULE", "RESOURCE"].includes(tipo) ? tipo : "KERNEL") as ContentType;

  const trees = await prisma.documentTree.findMany({
    where: {
      visibility: "PUBLIC",
      contentType,
      ...(q ? {
        OR: [
          { title:       { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { forks: true, likes: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const sorted = [...trees].sort((a, b) => {
    if (sort === "likes") return b._count.likes - a._count.likes;
    if (sort === "forks") return b._count.forks - a._count.forks;
    if (sort === "new")   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (b._count.likes * 2 + b._count.forks * 3) - (a._count.likes * 2 + a._count.forks * 3);
  });

  const badge = CONTENT_TYPE_BADGE[contentType];
  const style = CONTENT_TYPE_STYLE[contentType];

  const tabHref  = (t: string) => `/explorar?tipo=${t}${sort !== "trending" ? `&sort=${sort}` : ""}${q ? `&q=${q}` : ""}`;
  const sortHref = (s: string) => `/explorar?tipo=${contentType}&sort=${s}${q ? `&q=${q}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Explorar</h1>
        <p className="text-gray-500 mt-1">Descubrí kernels, módulos y recursos de todo el mundo.</p>
      </div>

      {/* Content type tabs */}
      <div className="flex gap-2 flex-wrap">
        {CONTENT_TABS.map((tab) => {
          const ts = CONTENT_TYPE_STYLE[tab.key];
          return (
            <Link key={tab.key} href={tabHref(tab.key)}
              className={`flex items-center gap-2 text-base px-5 py-3 rounded-xl border font-medium transition-colors ${
                contentType === tab.key
                  ? `${ts.btnCls} border-transparent`
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}>
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="get" className="flex gap-3 flex-wrap">
        <input type="hidden" name="tipo" value={contentType} />
        <input type="hidden" name="sort" value={sort} />
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input name="q" defaultValue={q}
            placeholder={`Buscar ${badge.label.toLowerCase()}s...`}
            className={`w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 ${style.ringCls} bg-white`} />
        </div>
        <button type="submit" className={`px-6 py-3 rounded-xl text-base font-medium transition-colors ${style.btnCls}`}>
          Buscar
        </button>
        <Link href="/nuevo" className={`flex items-center gap-2 border px-5 py-3 rounded-xl text-base font-medium transition-colors ${style.borderCls} ${style.textCls} ${style.lightBgCls} hover:opacity-80`}>
          {badge.icon}
          Crear {badge.label.toLowerCase()}
        </Link>
      </form>

      {/* Sort */}
      <div className="flex gap-2 flex-wrap items-center">
        {SORT_OPTIONS.map((opt) => (
          <Link key={opt.key} href={sortHref(opt.key)}
            className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border font-medium transition-colors ${
              sort === opt.key
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}>
            {opt.icon}
            {opt.label}
          </Link>
        ))}
        <p className="ml-auto text-sm text-gray-400">
          {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-gray-600 text-base">No se encontraron {badge.label.toLowerCase()}s.</p>
          <Link href="/nuevo" className={`inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-xl text-base font-medium transition-colors ${style.btnCls}`}>
            Crear el primero
          </Link>
        </div>
      ) : q ? (
        /* ── List layout when searching — easier to compare results ── */
        <div className="space-y-2">
          {sorted.map((tree) => {
            const tb = CONTENT_TYPE_BADGE[tree.contentType];
            const ts = CONTENT_TYPE_STYLE[tree.contentType];
            return (
              <div key={tree.id} className={`relative bg-white rounded-2xl border border-gray-200 ${ts.hoverBorderCls} hover:shadow-sm transition-all group flex items-start gap-4 p-5`}>
                <Link href={`/${tree.owner.username ?? tree.owner.id}/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

                {/* Left: type indicator */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ts.iconBgCls}`}>
                  {tb.icon}
                </div>

                {/* Center: content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tb.cls}`}>{tb.label}</span>
                    {tree.forkDepth > 0 && (
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <GitFork className="w-3 h-3" /> Fork
                      </span>
                    )}
                  </div>
                  <h3 className={`text-base font-bold text-gray-900 ${ts.groupHoverTextCls} transition-colors line-clamp-1`}>
                    {tree.title}
                  </h3>
                  {tree.description && (
                    <p className="text-gray-500 text-sm line-clamp-1 mt-0.5">{tree.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <Link href={`/${tree.owner.username ?? tree.owner.id}`} className="relative z-10 flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      {tree.owner.image ? (
                        <Image src={tree.owner.image} alt="" width={18} height={18} className="rounded-full" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[9px] font-bold">
                          {(tree.owner.name ?? "?")[0]}
                        </div>
                      )}
                      <span className="text-xs text-gray-500">{tree.owner.name}</span>
                    </Link>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
                  </div>
                </div>

                {/* Right: date */}
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{formatDate(tree.createdAt)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Grid layout for browsing ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((tree) => {
            const tb = CONTENT_TYPE_BADGE[tree.contentType];
            const ts = CONTENT_TYPE_STYLE[tree.contentType];
            return (
              <div key={tree.id} className={`relative bg-white rounded-2xl border border-gray-200 p-6 ${ts.hoverBorderCls} hover:shadow-md transition-all group flex flex-col`}>
                <Link href={`/${tree.owner.username ?? tree.owner.id}/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

                {/* Author */}
                <Link href={`/${tree.owner.username ?? tree.owner.id}`}
                  className="relative z-10 flex items-center gap-2 mb-4 w-fit hover:opacity-80 transition-opacity">
                  {tree.owner.image ? (
                    <Image src={tree.owner.image} alt="" width={28} height={28} className="rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                      {(tree.owner.name ?? "?")[0]}
                    </div>
                  )}
                  <span className="text-sm text-gray-500 hover:text-green-700 transition-colors">{tree.owner.name}</span>
                </Link>

                <h3 className={`text-base font-bold text-gray-900 ${ts.groupHoverTextCls} transition-colors line-clamp-2 mb-1 flex-1`}>
                  {tree.title}
                </h3>
                {tree.description && (
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">{tree.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tb.cls}`}>
                    {tb.icon}
                    {tb.label}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{tree._count.likes}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{tree._count.forks}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
