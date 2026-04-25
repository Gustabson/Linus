import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GitFork, BookOpen, Plus, Clock, Heart, Settings,
  Eye, TrendingUp,
} from "lucide-react";
import { DeleteTreeButton } from "@/components/trees/DeleteTreeButton";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_BADGE, CONTENT_TABS } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tab = "KERNEL" } = await searchParams;
  const activeTab = (["KERNEL", "MODULE", "RESOURCE"].includes(tab) ? tab : "KERNEL") as ContentType;

  const [allTrees, user] = await Promise.all([
    prisma.documentTree.findMany({
      where:   { ownerId: session.user.id },
      include: {
        parentTree: { select: { slug: true, title: true, contentType: true } },
        _count:     { select: { forks: true, likes: true, documents: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { name: true, username: true, image: true, bio: true },
    }),
  ]);

  const byType = {
    KERNEL:   allTrees.filter(t => t.contentType === "KERNEL"),
    MODULE:   allTrees.filter(t => t.contentType === "MODULE"),
    RESOURCE: allTrees.filter(t => t.contentType === "RESOURCE"),
  };

  const totalForks  = allTrees.reduce((acc, t) => acc + t._count.forks,  0);
  const activeTrees = byType[activeTab];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {user?.image ? (
            <Image src={user.image} alt="" width={56} height={56} className="rounded-2xl ring-2 ring-green-100" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold">
              {(user?.name ?? "?")[0]}
            </div>
          )}
          <div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Espacio de trabajo</p>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.name?.split(" ")[0]} 👋
              </h1>
            </div>
            {user?.username && <p className="text-sm text-gray-400">@{user.username}</p>}
          </div>
        </div>
        <Link
          href="/nuevo"
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear nuevo
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ...CONTENT_TABS.map(t => ({
            label: t.label,
            value: byType[t.key].length,
            icon:  CONTENT_TABS.find(x => x.key === t.key)!.icon,
            href:  `/dashboard?tab=${t.key}`,
          })),
          { label: "Forks recibidos", value: totalForks, icon: <GitFork className="w-4 h-4 text-gray-500" />, href: null as string | null },
        ].map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href}
              className="bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-green-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </Link>
          ) : (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {CONTENT_TABS.map((t) => (
          <Link key={t.key} href={`/dashboard?tab=${t.key}`}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}>
            {t.icon}
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === t.key ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {byType[t.key].length}
            </span>
          </Link>
        ))}
      </div>

      {/* Content */}
      {activeTrees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            {CONTENT_TABS.find(t => t.key === activeTab)?.icon}
          </div>
          <h3 className="font-medium text-gray-900 mb-1">
            Todavía no tenés {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}s
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {activeTab === "KERNEL"
              ? "Creá el currículo base de tu escuela o forkeá uno existente."
              : activeTab === "MODULE"
              ? "Creá unidades didácticas independientes que podés adjuntar a cualquier kernel."
              : "Creá materiales de apoyo que podés adjuntar a cualquier kernel."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/explorar" className="text-sm text-green-700 hover:underline">
              Explorar {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}s de otros
            </Link>
            <Link href="/nuevo" className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors">
              Crear {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTrees.map((tree) => {
            const badge = CONTENT_TYPE_BADGE[tree.contentType];
            return (
              <div key={tree.id} className="relative bg-white rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all group flex flex-col">
                <Link href={`/t/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {tree.parentTree && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        Fork de {tree.parentTree.title}
                      </span>
                    )}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      tree.visibility === "PUBLIC"   ? "bg-green-50 text-green-600" :
                      tree.visibility === "UNLISTED" ? "bg-gray-100 text-gray-500"  :
                                                       "bg-red-50 text-red-500"
                    }`}>
                      {tree.visibility === "PUBLIC" ? "Público" : tree.visibility === "UNLISTED" ? "No listado" : "Privado"}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2 flex-1">
                    {tree.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
                    {tree.contentType === "KERNEL" && (
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{tree._count.documents} docs</span>
                    )}
                    <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{formatDate(tree.updatedAt)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-2.5 flex items-center gap-2 flex-wrap">
                  <Link href={`/t/${tree.slug}`}
                    className="relative z-10 flex items-center gap-1 text-xs text-gray-500 hover:text-green-700 transition-colors px-2 py-1 rounded-lg hover:bg-green-50">
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </Link>
                  <Link href={`/t/${tree.slug}/configuracion`}
                    className="relative z-10 flex items-center gap-1 text-xs text-gray-500 hover:text-green-700 transition-colors px-2 py-1 rounded-lg hover:bg-green-50">
                    <Settings className="w-3.5 h-3.5" /> Configurar
                  </Link>
                  <DeleteTreeButton slug={tree.slug} title={tree.title} hasForks={tree._count.forks > 0} />
                  {tree._count.forks > 0 && (
                    <span className="ml-auto relative z-10 flex items-center gap-1 text-xs text-gray-400">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      {tree._count.forks} fork{tree._count.forks !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
