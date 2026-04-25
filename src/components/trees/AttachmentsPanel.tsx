"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Puzzle, Package, Plus, X, Search, Loader2, Heart, GitFork, ExternalLink } from "lucide-react";

interface AttachedTree {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  owner: { name: string | null; username: string | null };
  _count: { likes: number; forks: number };
}

interface Attachment {
  id: string;
  content: AttachedTree;
}

const TYPE_META = {
  MODULE:   { label: "Módulo",  icon: <Puzzle className="w-3.5 h-3.5" />,  cls: "bg-blue-100 text-blue-800",  emptyText: "No hay módulos adjuntos.",  hint: "Adjuntá unidades didácticas de otros maestros o creá la tuya."  },
  RESOURCE: { label: "Recurso", icon: <Package className="w-3.5 h-3.5" />, cls: "bg-amber-100 text-amber-800", emptyText: "No hay recursos adjuntos.", hint: "Adjuntá materiales de apoyo o creá el tuyo." },
} as const;

type ContentType = keyof typeof TYPE_META;

// ── Single-type section ──────────────────────────────────────────────────────
function AttachSection({
  type,
  kernelSlug,
  kernelId,
  initialItems,
  isOwner,
}: {
  type: ContentType;
  kernelSlug: string;
  kernelId: string;
  initialItems: Attachment[];
  isOwner: boolean;
}) {
  const meta = TYPE_META[type];
  const [items, setItems] = useState(initialItems);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttachedTree[]>([]);
  const [searching, setSearching] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(
        `/api/trees/search?q=${encodeURIComponent(query)}&types=${type}&exclude=${kernelId}`
      );
      if (res.ok) setResults(await res.json());
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, showSearch, kernelId, type]);

  async function attach(contentId: string) {
    setAttaching(contentId);
    const res = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (res.ok) {
      const newAtt = await res.json();
      setItems((prev) => [...prev, newAtt]);
      setResults((prev) => prev.filter((r) => r.id !== contentId));
    }
    setAttaching(null);
  }

  async function detach(attachmentId: string, contentId: string) {
    const res = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (res.ok) setItems((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
            {meta.icon} {meta.label}s
          </span>
          <span className="text-sm text-gray-400">{items.length}</span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch(!showSearch); setQuery(""); setResults([]); }}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-700 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-green-200 hover:bg-green-50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Adjuntar
            </button>
            <Link
              href={`/nuevo?tipo=${type}`}
              className="flex items-center gap-1 text-xs bg-green-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Link>
          </div>
        )}
      </div>

      {/* Search dropdown */}
      {showSearch && (
        <div className="bg-white rounded-xl border border-green-200 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${meta.label.toLowerCase()}s públicos...`}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
          </div>

          {results.length === 0 && !searching && (
            <p className="text-xs text-gray-400 text-center py-3">
              {query ? "Sin resultados." : `Escribí para buscar ${meta.label.toLowerCase()}s.`}
            </p>
          )}

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {results.map((tree) => (
              <div key={tree.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{tree.title}</p>
                  <p className="text-xs text-gray-400">
                    {tree.owner.username ? `@${tree.owner.username}` : tree.owner.name}
                    {" · "}❤ {tree._count.likes} · ⑂ {tree._count.forks}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/t/${tree.slug}`} target="_blank"
                    className="p-1 text-gray-400 hover:text-green-700" title="Ver">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => attach(tree.id)}
                    disabled={attaching === tree.id}
                    className="text-xs bg-green-700 text-white px-2.5 py-1 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {attaching === tree.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Adjuntar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          {meta.emptyText}
          {isOwner && <span> {meta.hint}</span>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((att) => (
            <div key={att.id}
              className="relative bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-colors group flex flex-col gap-2">
              <Link href={`/t/${att.content.slug}`} className="absolute inset-0 rounded-xl" aria-label={att.content.title} />

              <p className="font-medium text-gray-900 text-sm group-hover:text-green-700 transition-colors line-clamp-2">
                {att.content.title}
              </p>
              <p className="text-xs text-gray-400">
                {att.content.owner.username ? `@${att.content.owner.username}` : att.content.owner.name}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{att.content._count.likes}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{att.content._count.forks}</span>
                {isOwner && (
                  <button onClick={() => detach(att.id, att.content.id)}
                    className="relative z-10 ml-auto p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Desadjuntar">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export function AttachmentsPanel({
  kernelSlug,
  kernelId,
  initialAttachments,
  isOwner,
}: {
  kernelSlug: string;
  kernelId: string;
  initialAttachments: Attachment[];
  isOwner: boolean;
}) {
  const modules   = initialAttachments.filter((a) => a.content.contentType === "MODULE");
  const resources = initialAttachments.filter((a) => a.content.contentType === "RESOURCE");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Módulos</h2>

      <AttachSection
        type="MODULE"
        kernelSlug={kernelSlug}
        kernelId={kernelId}
        initialItems={modules}
        isOwner={isOwner}
      />

      <AttachSection
        type="RESOURCE"
        kernelSlug={kernelSlug}
        kernelId={kernelId}
        initialItems={resources}
        isOwner={isOwner}
      />
    </div>
  );
}
