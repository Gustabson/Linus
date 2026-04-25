"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Puzzle, Package, Plus, X, Search, Loader2, Heart, GitFork } from "lucide-react";

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

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  MODULE:   { label: "Módulo",  icon: <Puzzle className="w-3.5 h-3.5" />,  cls: "bg-blue-100 text-blue-800"  },
  RESOURCE: { label: "Recurso", icon: <Package className="w-3.5 h-3.5" />, cls: "bg-amber-100 text-amber-800" },
};

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
  const [attachments, setAttachments] = useState(initialAttachments);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttachedTree[]>([]);
  const [searching, setSearching] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!showSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(
        `/api/trees/search?q=${encodeURIComponent(query)}&types=MODULE,RESOURCE&exclude=${kernelId}`
      );
      if (res.ok) setResults(await res.json());
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, showSearch, kernelId]);

  async function attach(contentId: string) {
    setAttaching(contentId);
    const res = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (res.ok) {
      const newAttachment = await res.json();
      setAttachments((prev) => [...prev, newAttachment]);
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
    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }
  }

  const modules   = attachments.filter((a) => a.content.contentType === "MODULE");
  const resources = attachments.filter((a) => a.content.contentType === "RESOURCE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Módulos adjuntos</h2>
        {isOwner && (
          <button
            onClick={() => { setShowSearch(!showSearch); setQuery(""); setResults([]); }}
            className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adjuntar
          </button>
        )}
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="bg-white rounded-2xl border border-green-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar módulos o recursos públicos..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
          </div>

          {results.length === 0 && !searching && (
            <p className="text-sm text-gray-400 text-center py-4">
              {query ? "No se encontraron resultados." : "Escribí para buscar módulos o recursos públicos."}
            </p>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((tree) => {
              const meta = TYPE_META[tree.contentType] ?? TYPE_META.MODULE;
              return (
                <div key={tree.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">{tree.title}</p>
                    <p className="text-xs text-gray-400">
                      {tree.owner.username ? `@${tree.owner.username}` : tree.owner.name}
                      {" · "}
                      <Heart className="w-3 h-3 inline" /> {tree._count.likes}
                      {"  "}
                      <GitFork className="w-3 h-3 inline" /> {tree._count.forks}
                    </p>
                  </div>
                  <button
                    onClick={() => attach(tree.id)}
                    disabled={attaching === tree.id}
                    className="shrink-0 text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
                  >
                    {attaching === tree.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Adjuntar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attached list */}
      {attachments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
          No hay módulos adjuntos.
          {isOwner && " Adjuntá unidades didácticas o materiales de otros maestros."}
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { label: "Módulos", items: modules, type: "MODULE" },
            { label: "Recursos", items: resources, type: "RESOURCE" },
          ].map(({ label, items, type }) =>
            items.length === 0 ? null : (
              <div key={type}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((att) => {
                    const meta = TYPE_META[att.content.contentType] ?? TYPE_META.MODULE;
                    return (
                      <div key={att.id} className="relative bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-colors group flex flex-col gap-2">
                        <Link href={`/t/${att.content.slug}`} className="absolute inset-0 rounded-xl" aria-label={att.content.title} />

                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
                            {meta.icon} {meta.label}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => detach(att.id, att.content.id)}
                              className="relative z-10 ml-auto p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Desadjuntar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="font-medium text-gray-900 text-sm group-hover:text-green-700 transition-colors line-clamp-2">
                          {att.content.title}
                        </p>

                        <p className="text-xs text-gray-400">
                          {att.content.owner.username
                            ? `@${att.content.owner.username}`
                            : att.content.owner.name}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {att.content._count.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3" /> {att.content._count.forks}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
