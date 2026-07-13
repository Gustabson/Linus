"use client";

import { useEffect, useState } from "react";
import type { ContentType, TreeVisibility } from "@prisma/client";
import { Globe2, Loader2, Lock, Search, UserRound, X } from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { SharedTreeData } from "@/lib/comments";

export type TreePickerResult = SharedTreeData & { visibility: TreeVisibility };

const TYPE_FILTERS: Array<{ value: "ALL" | ContentType; label: string }> = [
  { value: "ALL", label: "Todo" },
  { value: "KERNEL", label: "Kernels" },
  { value: "MODULE", label: "Módulos" },
  { value: "RESOURCE", label: "Recursos" },
];
const ALL_CONTENT_TYPES: ContentType[] = ["KERNEL", "MODULE", "RESOURCE"];

export function TreePickerModal({
  open,
  onClose,
  onSelect,
  allowedTypes = ALL_CONTENT_TYPES,
  excludeTreeId,
  allowPrivate = false,
  title = "Adjuntar contenido educativo",
  description = "Elegí un kernel, módulo o recurso para mostrarlo como tarjeta.",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (tree: TreePickerResult) => void;
  allowedTypes?: ContentType[];
  excludeTreeId?: string;
  allowPrivate?: boolean;
  title?: string;
  description?: string;
}) {
  const [scope, setScope] = useState<"mine" | "global">("mine");
  const [type, setType] = useState<"ALL" | ContentType>("ALL");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TreePickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const allowedTypesKey = allowedTypes.join(",");
  const availableFilters = TYPE_FILTERS.filter((filter) =>
    filter.value === "ALL" || allowedTypes.includes(filter.value)
  );

  useEffect(() => {
    if (allowedTypes.length === 1) setType(allowedTypes[0]);
    else if (type !== "ALL" && !allowedTypes.includes(type)) setType("ALL");
  }, [allowedTypesKey, type]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        scope,
        types: type === "ALL" ? allowedTypes.join(",") : type,
        limit: "20",
      });
      if (excludeTreeId) params.set("exclude", excludeTreeId);
      if (query.trim()) params.set("q", query.trim());

      try {
        const response = await fetch(`/api/trees/search?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el contenido");
        setResults(data.trees ?? []);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el contenido");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [allowedTypesKey, excludeTreeId, open, query, scope, type]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tree-picker-title"
        className="flex max-h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <h2 id="tree-picker-title" className="text-base font-bold text-text">{title}</h2>
            <p className="mt-0.5 text-xs text-text-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar selector" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-subtle hover:bg-bg hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 border-b border-border-subtle px-5 py-4">
          <div className="grid grid-cols-2 rounded-xl bg-bg p-1">
            <button
              type="button"
              onClick={() => setScope("mine")}
              aria-pressed={scope === "mine"}
              className={`flex min-h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${scope === "mine" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              <UserRound className="h-4 w-4" /> Mi espacio
            </button>
            <button
              type="button"
              onClick={() => setScope("global")}
              aria-pressed={scope === "global"}
              className={`flex min-h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${scope === "global" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              <Globe2 className="h-4 w-4" /> Global
            </button>
          </div>

          {allowedTypes.length > 1 && <div className="flex flex-wrap gap-1.5" aria-label="Filtrar por tipo">
            {availableFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setType(filter.value)}
                aria-pressed={type === filter.value}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${type === filter.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary/20 hover:text-text"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>}

          <label className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 focus-within:border-primary/40">
            <Search className="h-4 w-4 shrink-0 text-text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              placeholder="Buscar por título…"
              aria-label="Buscar contenido"
              className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="text-text-subtle hover:text-text">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-56 flex-1 overflow-y-auto p-3 sm:p-4">
          {loading && (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando contenido…
            </div>
          )}
          {!loading && error && <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm text-danger">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Search className="mb-2 h-6 w-6 text-text-subtle" />
              <p className="text-sm font-semibold text-text">No encontramos contenido</p>
              <p className="mt-1 text-xs text-text-muted">Probá otro término, tipo o ámbito.</p>
            </div>
          )}
          {!loading && !error && results.length > 0 && (
            <div className="space-y-2">
              {results.map((tree) => {
                const style = CONTENT_TYPE_STYLE[tree.contentType];
                const isPrivate = tree.visibility === "PRIVATE";
                const privateBlocked = isPrivate && !allowPrivate;
                const ownerIdentity = [
                  tree.owner.name,
                  tree.owner.username ? `@${tree.owner.username}` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <button
                    key={tree.id}
                    type="button"
                    disabled={privateBlocked}
                    onClick={() => onSelect(tree)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-border-subtle p-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.iconBgCls}`}>{style.iconLg}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badgeCls}`}>{style.label}</span>
                        {isPrivate && <span className="flex items-center gap-1 text-[10px] font-semibold text-text-subtle"><Lock className="h-3 w-3" /> Privado</span>}
                      </span>
                      <span className="mt-1 block truncate text-sm font-bold text-text transition-colors group-hover:text-primary">{tree.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">
                        {privateBlocked ? "Cambiá la visibilidad para poder compartirlo" : ownerIdentity || "Usuario"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
