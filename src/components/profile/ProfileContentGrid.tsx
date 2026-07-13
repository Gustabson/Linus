"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { ArrowUpRight, Clock, GitFork, Search } from "lucide-react";
import { LikeButton } from "@/components/trees/LikeButton";
import { CONTENT_TABS, CONTENT_TYPE_STYLE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export interface ProfileTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  forkDepth: number;
  updatedAt: string;
  initialLiked: boolean;
  _count: { forks: number; likes: number };
}

type ContentFilter = "ALL" | ContentType;

const TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  KERNEL: "Currículo educativo completo listo para explorar y reutilizar.",
  MODULE: "Unidad didáctica reutilizable para incorporar en otros contenidos.",
  RESOURCE: "Material de apoyo creado para compartir con la comunidad.",
};

export function ProfileContentGrid({
  trees,
  ownerPath,
  isAuthenticated,
}: {
  trees: ProfileTree[];
  ownerPath: string;
  isAuthenticated: boolean;
}) {
  const [filter, setFilter] = useState<ContentFilter>("ALL");
  const visibleTrees = useMemo(
    () => filter === "ALL" ? trees : trees.filter((tree) => tree.contentType === filter),
    [filter, trees],
  );

  const filters: Array<{ key: ContentFilter; label: string; count: number }> = [
    { key: "ALL", label: "Todo", count: trees.length },
    ...CONTENT_TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      count: trees.filter((tree) => tree.contentType === tab.key).length,
    })),
  ];

  if (trees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Search className="h-5 w-5" /></span>
        <h3 className="mt-3 font-bold text-text">Todavía no hay contenido público</h3>
        <p className="mt-1 text-sm text-text-muted">Cuando este usuario publique un contenido, aparecerá acá.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-1.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-text"}`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary/10 text-primary" : "bg-border-subtle text-text-subtle"}`}>{item.count}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden shrink-0 pr-2 text-xs text-text-subtle sm:block">{visibleTrees.length} contenidos</span>
      </div>

      {visibleTrees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Search className="h-5 w-5" /></span>
          <h3 className="mt-3 font-bold text-text">No hay contenido de este tipo</h3>
          <p className="mt-1 text-sm text-text-muted">Probá con otra categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleTrees.map((tree) => (
            <ProfileTreeCard
              key={tree.id}
              tree={tree}
              href={`/${ownerPath}/${tree.slug}`}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTreeCard({
  tree,
  href,
  isAuthenticated,
}: {
  tree: ProfileTree;
  href: string;
  isAuthenticated: boolean;
}) {
  const style = CONTENT_TYPE_STYLE[tree.contentType];

  return (
    <article className={`group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${style.borderCls} ${style.hoverBorderCls}`}>
      <Link href={href} aria-label={`Abrir ${tree.title}`} className="absolute inset-0 z-0" />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badgeCls}`}>
              {style.icon} {style.label}
            </span>
            {tree.forkDepth > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-border-subtle px-2 py-1 text-[10px] font-semibold text-text-muted">
                <GitFork className="h-3 w-3" /> Fork
              </span>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-subtle">
            <Clock className="h-3.5 w-3.5" /> {formatDate(new Date(tree.updatedAt))}
          </span>
        </div>

        <h2 className={`mt-4 line-clamp-2 text-lg font-bold leading-snug text-text transition-colors ${style.groupHoverTextCls}`}>{tree.title}</h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-muted">{tree.description || TYPE_DESCRIPTIONS[tree.contentType]}</p>

        <div className="pointer-events-auto mt-auto flex items-center gap-2 pt-5">
          <LikeButton
            treeSlug={tree.slug}
            initialLiked={tree.initialLiked}
            initialCount={tree._count.likes}
            isAuthenticated={isAuthenticated}
            compact
          />
          <span className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-text-subtle" aria-label={`${tree._count.forks} forks`}>
            <GitFork className="h-4 w-4" /> {tree._count.forks}
          </span>
          <span className={`pointer-events-none ml-auto flex items-center gap-1.5 text-sm font-bold ${style.textCls}`}>
            Abrir <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
