"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ContentType, TreeVisibility } from "@prisma/client";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Clock,
  GitFork,
  Heart,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { CONTENT_TABS, CONTENT_TYPE_STYLE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useRouter } from "@/hooks/useAppRouter";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface WorkspaceTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: TreeVisibility;
  contentType: ContentType;
  updatedAt: string;
  parentTree: { slug: string; title: string; contentType: ContentType } | null;
  _count: { forks: number; likes: number; documents: number };
}

interface WorkspaceUser {
  name: string | null;
  username: string | null;
  image: string | null;
}

type SortMode = "updated" | "name" | "popular";
type VisibilityFilter = "ALL" | TreeVisibility;

const TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  KERNEL: "Currículos completos que podés desarrollar, publicar y compartir.",
  MODULE: "Unidades didácticas reutilizables que podés conectar a distintos kernels.",
  RESOURCE: "Materiales de apoyo, guías y herramientas para la comunidad educativa.",
};

const VISIBILITY_LABELS: Record<TreeVisibility, string> = {
  PUBLIC: "Público",
  UNLISTED: "No listado",
  PRIVATE: "Privado",
};

function visibilityClasses(visibility: TreeVisibility) {
  if (visibility === "PUBLIC") return "bg-primary/10 text-primary";
  if (visibility === "PRIVATE") return "bg-danger/10 text-danger";
  return "bg-border-subtle text-text-muted";
}

export function WorkspaceDashboard({
  initialTab,
  trees,
  user,
  ownerPath,
}: {
  initialTab: ContentType;
  trees: WorkspaceTree[];
  user: WorkspaceUser;
  ownerPath: string;
}) {
  const router = useRouter();
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ContentType>(initialTab);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("ALL");
  const [sort, setSort] = useState<SortMode>("updated");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) setCreateMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCreateMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const counts = useMemo(() => ({
    KERNEL: trees.filter((tree) => tree.contentType === "KERNEL").length,
    MODULE: trees.filter((tree) => tree.contentType === "MODULE").length,
    RESOURCE: trees.filter((tree) => tree.contentType === "RESOURCE").length,
  }), [trees]);
  const totalForks = useMemo(() => trees.reduce((total, tree) => total + tree._count.forks, 0), [trees]);

  const activeTrees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const result = trees.filter((tree) => {
      if (tree.contentType !== activeTab) return false;
      if (visibility !== "ALL" && tree.visibility !== visibility) return false;
      if (!normalizedQuery) return true;
      return tree.title.toLocaleLowerCase("es").includes(normalizedQuery)
        || tree.description?.toLocaleLowerCase("es").includes(normalizedQuery);
    });

    return result.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
      if (sort === "popular") {
        return (b._count.forks + b._count.likes) - (a._count.forks + a._count.likes);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeTab, query, sort, trees, visibility]);

  function selectTab(tab: ContentType) {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  }

  const activeStyle = CONTENT_TYPE_STYLE[activeTab];
  const activeCount = counts[activeTab];
  const hasFilters = !!query.trim() || visibility !== "ALL";
  const firstName = user.name?.trim().split(/\s+/)[0] ?? user.username ?? "Tu espacio";

  return (
    <div className="w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {user.image ? (
            <Image src={user.image} alt="" width={54} height={54} className="h-[54px] w-[54px] shrink-0 rounded-2xl object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-2 ring-primary/10">
              {(user.name ?? user.username ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Mi espacio</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-text">Espacio de {firstName}</h1>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {user.username ? `@${user.username} · ` : ""}Gestioná tus contenidos y colaboración
            </p>
          </div>
        </div>

        <div className="relative w-full shrink-0 sm:w-auto" ref={createMenuRef}>
          <button
            type="button"
            onClick={() => setCreateMenuOpen((open) => !open)}
            aria-expanded={createMenuOpen}
            aria-haspopup="menu"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg shadow-sm transition-colors hover:bg-primary-h sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Crear nuevo <ChevronDown className="h-4 w-4" />
          </button>
          {createMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-xl">
              {CONTENT_TABS.map((tab) => {
                const style = CONTENT_TYPE_STYLE[tab.key];
                return (
                  <Link
                    key={tab.key}
                    href={`/nuevo?tipo=${tab.key}`}
                    role="menuitem"
                    onClick={() => setCreateMenuOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-bg"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.iconBgCls}`}>{style.iconLg}</span>
                    <span>
                      <span className="block text-sm font-bold text-text">Crear {style.label.toLowerCase()}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-text-muted">{TYPE_DESCRIPTIONS[tab.key]}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <section aria-label="Resumen del espacio" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CONTENT_TABS.map((tab) => {
          const style = CONTENT_TYPE_STYLE[tab.key];
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              aria-pressed={active}
              className={`flex min-h-20 items-center gap-3 rounded-2xl border bg-surface p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? `${style.accentBorderCls} ring-1 ring-primary/10` : `border-border ${style.hoverBorderCls}`}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.iconBgCls}`}>{style.iconLg}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-text-muted">{tab.label}</span>
                <span className="mt-0.5 block text-2xl font-bold leading-none text-text">{counts[tab.key]}</span>
              </span>
            </button>
          );
        })}
        <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GitFork className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-text-muted">Forks recibidos</span>
            <span className="mt-0.5 block text-2xl font-bold leading-none text-text">{totalForks}</span>
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 overflow-x-auto border-b border-border">
          <div className="flex min-w-max">
            {CONTENT_TABS.map((tab) => {
              const style = CONTENT_TYPE_STYLE[tab.key];
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  aria-pressed={active}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors sm:px-4 ${active ? `${style.accentBorderCls} ${style.textCls}` : "border-transparent text-text-muted hover:text-text"}`}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>
          <p className="hidden pb-3 text-xs text-text-subtle sm:block">{activeTrees.length} de {activeCount}</p>
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-primary/40">
            <Search className="h-4 w-4 shrink-0 text-text-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar ${activeStyle.label.toLowerCase()}s…`}
              aria-label={`Buscar ${activeStyle.label.toLowerCase()}s`}
              className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="text-text-subtle hover:text-text"><X className="h-3.5 w-3.5" /></button>}
          </label>
          <div className="grid grid-cols-2 gap-2.5 lg:flex">
            <label className="relative">
              <span className="sr-only">Filtrar visibilidad</span>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
                className="min-h-10 w-full appearance-none rounded-xl border border-border bg-surface py-2 pl-3 pr-9 text-sm text-text focus:border-primary/40 focus:outline-none lg:w-40"
              >
                <option value="ALL">Toda visibilidad</option>
                <option value="PUBLIC">Públicos</option>
                <option value="UNLISTED">No listados</option>
                <option value="PRIVATE">Privados</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            </label>
            <label className="relative">
              <span className="sr-only">Ordenar contenidos</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="min-h-10 w-full appearance-none rounded-xl border border-border bg-surface py-2 pl-3 pr-9 text-sm text-text focus:border-primary/40 focus:outline-none lg:w-48"
              >
                <option value="updated">Actualizados recientemente</option>
                <option value="name">Nombre A–Z</option>
                <option value="popular">Más populares</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            </label>
          </div>
        </div>

        {activeTrees.length === 0 ? (
          <WorkspaceEmptyState
            activeTab={activeTab}
            hasAny={activeCount > 0}
            hasFilters={hasFilters}
            onReset={() => { setQuery(""); setVisibility("ALL"); }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeTrees.map((tree) => (
              <WorkspaceTreeCard key={tree.id} tree={tree} ownerPath={ownerPath} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkspaceEmptyState({
  activeTab,
  hasAny,
  hasFilters,
  onReset,
}: {
  activeTab: ContentType;
  hasAny: boolean;
  hasFilters: boolean;
  onReset: () => void;
}) {
  const style = CONTENT_TYPE_STYLE[activeTab];
  if (hasAny && hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className={`mx-auto grid h-11 w-11 place-items-center rounded-xl ${style.iconBgCls}`}><Search className="h-5 w-5" /></span>
        <h3 className="mt-3 font-bold text-text">No hay resultados con estos filtros</h3>
        <p className="mt-1 text-sm text-text-muted">Probá otro término o restablecé la visibilidad.</p>
        <button type="button" onClick={onReset} className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15">Restablecer filtros</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-xl ${style.iconBgCls}`}>{style.iconLg}</span>
      <h3 className="mt-3 font-bold text-text">Todavía no tenés {style.label.toLowerCase()}s</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-text-muted">{TYPE_DESCRIPTIONS[activeTab]}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link href={`/nuevo?tipo=${activeTab}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-h">Crear {style.label.toLowerCase()}</Link>
        <Link href={`/explorar?tipo=${activeTab}`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:border-primary/30 hover:text-primary">Explorar contenido</Link>
      </div>
    </div>
  );
}

function WorkspaceTreeCard({ tree, ownerPath }: { tree: WorkspaceTree; ownerPath: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const style = CONTENT_TYPE_STYLE[tree.contentType];
  const href = `/${ownerPath}/${tree.slug}`;

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function deleteTree() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/trees/${tree.slug}/settings`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar el contenido");
      setMenuOpen(false);
      setConfirmDelete(false);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el contenido");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
    <article className={`group relative flex min-h-56 flex-col overflow-visible rounded-2xl border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${style.borderCls} ${style.hoverBorderCls}`}>
      <Link href={href} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Abrir ${tree.title}`} />

      <div className="relative z-10 flex flex-1 flex-col p-5 pointer-events-none">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.iconBgCls}`}>{style.iconLg}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badgeCls}`}>{style.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${visibilityClasses(tree.visibility)}`}>{VISIBILITY_LABELS[tree.visibility]}</span>
            </div>
          </div>
          <div className="pointer-events-auto relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={`Acciones de ${tree.title}`}
              aria-expanded={menuOpen}
              className="grid h-8 w-8 place-items-center rounded-lg text-text-subtle hover:bg-bg hover:text-text"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                <Link href={`${href}/configuracion`} role="menuitem" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text">
                  <Settings className="h-4 w-4" /> Configurar
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-4 line-clamp-2 text-lg font-bold leading-snug text-text transition-colors group-hover:text-primary">{tree.title}</h2>
        <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-relaxed text-text-muted">{tree.description || TYPE_DESCRIPTIONS[tree.contentType]}</p>

        {tree.parentTree && (
          <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-text-subtle"><GitFork className="h-3.5 w-3.5 shrink-0" /> Fork de {tree.parentTree.title}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-xs text-text-subtle">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {tree._count.likes}</span>
          <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> {tree._count.forks}</span>
          {tree.contentType === "KERNEL" && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {tree._count.documents} docs</span>}
          <span className="ml-auto flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(new Date(tree.updatedAt))}</span>
        </div>
        {error && <p role="alert" className="pointer-events-auto mt-2 text-xs text-danger">{error}</p>}
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-border-subtle px-5 py-3 pointer-events-none">
        <span className="text-xs font-semibold text-text-muted">Última edición</span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-primary">Abrir <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
      </div>
    </article>
      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar “${tree.title}”`}
          description={tree._count.forks > 0
            ? "Esta acción no se puede deshacer. Los forks existentes se conservarán."
            : "Esta acción no se puede deshacer."}
          confirmLabel="Eliminar contenido"
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void deleteTree()}
        />
      )}
    </>
  );
}
