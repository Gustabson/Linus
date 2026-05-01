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
import { CONTENT_TYPE_BADGE, CONTENT_TYPE_STYLE, CONTENT_TABS } from "@/lib/constants";
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
            <Image src={user.image} alt="" width={56} height={56} className="rounded-2xl ring-2 ring-primary/20" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {(user?.name ?? "?")[0]}
            </div>
          )}
          <div>
            <div>
              <p className="text-xs font-medium text-text-subtle uppercase tracking-wide mb-0.5">Espacio de trabajo</p>
              <h1 className="text-2xl font-bold text-text">
                {user?.name?.split(" ")[0]} 👋
              </h1>
            </div>
            {user?.username && <p className="text-sm text-text-subtle">@{user.username}</p>}
          </div>
        </div>
        <Link
          href="/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-base font-semibold hover:bg-primary-h transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Crear nuevo
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONTENT_TABS.map((t) => {
          const ts = CONTENT_TYPE_STYLE[t.key];
          return (
            <Link key={t.key} href={`/dashboard?tab=${t.key}`}
              className={`bg-surface rounded-2xl border border-border px-4 py-3 ${ts.hoverBorderCls} transition-colors`}>
              <div className="flex items-center gap-2 mb-1">{t.icon}<span className="text-xs text-text-muted">{t.label}</span></div>
              <p className="text-2xl font-bold text-text">{byType[t.key].length}</p>
            </Link>
          );
        })}
        <div className="bg-surface rounded-2xl border border-border px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted">Forks recibidos</span>
          </div>
          <p className="text-2xl font-bold text-text">{totalForks}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {CONTENT_TABS.map((t) => {
          const ts       = CONTENT_TYPE_STYLE[t.key];
          const isActive = activeTab === t.key;
          return (
            <Link key={t.key} href={`/dashboard?tab=${t.key}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? `${ts.accentBorderCls} ${ts.textCls}`
                  : "border-transparent text-text-muted hover:text-text"
              }`}>
              {t.icon}
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? ts.badgeCls : "bg-border-subtle text-text-muted"}`}>
                {byType[t.key].length}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {activeTrees.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-border-subtle flex items-center justify-center text-text-subtle">
            {CONTENT_TABS.find(t => t.key === activeTab)?.icon}
          </div>
          <h3 className="font-medium text-text mb-1">
            Todavía no tenés {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}s
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {activeTab === "KERNEL"
              ? "Creá el currículo base de tu escuela o forkeá uno existente."
              : activeTab === "MODULE"
              ? "Creá unidades didácticas independientes que podés adjuntar a cualquier kernel."
              : "Creá materiales de apoyo que podés adjuntar a cualquier kernel."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/buscar" className="text-sm text-primary hover:underline">
              Explorar {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}s de otros
            </Link>
            <Link href="/nuevo" className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-h transition-colors">
              Crear {CONTENT_TYPE_BADGE[activeTab].label.toLowerCase()}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTrees.map((tree) => {
            const badge = CONTENT_TYPE_BADGE[tree.contentType];
            const ts    = CONTENT_TYPE_STYLE[tree.contentType];
            return (
              <div key={tree.id} className={`relative bg-surface rounded-2xl border border-border ${ts.hoverBorderCls} hover:shadow-md transition-all group flex flex-col`}>
                <Link href={`/${session.user.username ?? session.user.id}/${tree.slug}`} className="absolute inset-0 rounded-2xl" aria-label={tree.title} />

                <div className="p-6 flex flex-col gap-4 flex-1">
                  {/* Top row: badge + visibility */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {tree.parentTree && (
                      <span className="text-xs text-text-subtle flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        Fork de {tree.parentTree.title}
                      </span>
                    )}
                    <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
                      tree.visibility === "PUBLIC"   ? "bg-primary/5 text-primary" :
                      tree.visibility === "UNLISTED" ? "bg-border-subtle text-text-muted"  :
                                                       "bg-red-50 text-red-500"
                    }`}>
                      {tree.visibility === "PUBLIC" ? "Público" : tree.visibility === "UNLISTED" ? "No listado" : "Privado"}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-base font-bold text-text ${ts.groupHoverTextCls} transition-colors line-clamp-2 flex-1`}>
                    {tree.title}
                  </h3>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-text-subtle">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{tree._count.likes}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-4 h-4" />{tree._count.forks}</span>
                    {tree.contentType === "KERNEL" && (
                      <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{tree._count.documents} docs</span>
                    )}
                    <span className="flex items-center gap-1 ml-auto text-xs"><Clock className="w-3.5 h-3.5" />{formatDate(tree.updatedAt)}</span>
                  </div>
                </div>

                <div className="border-t border-border-subtle px-6 py-3 flex items-center gap-3 flex-wrap">
                  <Link href={`/${session.user.username ?? session.user.id}/${tree.slug}`}
                    className="relative z-10 flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5">
                    <Eye className="w-4 h-4" /> Ver
                  </Link>
                  <Link href={`/${session.user.username ?? session.user.id}/${tree.slug}/configuracion`}
                    className="relative z-10 flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5">
                    <Settings className="w-4 h-4" /> Configurar
                  </Link>
                  <DeleteTreeButton slug={tree.slug} title={tree.title} hasForks={tree._count.forks > 0} />
                  {tree._count.forks > 0 && (
                    <span className="ml-auto relative z-10 flex items-center gap-1.5 text-sm text-primary font-medium">
                      <TrendingUp className="w-4 h-4" />
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
