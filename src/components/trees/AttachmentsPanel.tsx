"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Puzzle, Plus, X, Search, Loader2,
  Heart, GitFork, ExternalLink, FileText,
} from "lucide-react";

interface AttachedTree {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  owner: { name: string | null; username: string | null; id?: string };
  _count: { likes: number; forks: number };
}

interface Attachment {
  id: string;
  content: AttachedTree;
}

const MODULE_META = {
  label: "Módulo",
  plural: "Módulos",
  icon: <Puzzle className="w-3.5 h-3.5" />,
  cls: "bg-blue-100 text-blue-800",
  emptyText: "No hay módulos adjuntos.",
  hint: "Creá una unidad didáctica o adjuntá una existente.",
  placeholder: "Ej: Unidad de Fracciones — 4to grado",
};

// ── Modules section ──────────────────────────────────────────────────────────
function AttachSection({
  kernelSlug,
  kernelId,
  initialItems,
  canAdd,
}: {
  kernelSlug: string;
  kernelId: string;
  initialItems: Attachment[];
  canAdd: boolean;
}) {
  const meta = MODULE_META;
  const router = useRouter();
  const { data: session } = useSession();
  const [items, setItems] = useState(initialItems);

  // Inline create
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Search existing
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
        `/api/trees/search?q=${encodeURIComponent(query)}&types=MODULE&exclude=${kernelId}`
      );
      if (res.ok) { const data = await res.json(); setResults(data.trees ?? data); }
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, showSearch, kernelId]);

  // Create tree + first document + attach → redirect to editor
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);

    // 1. Create the tree
    const treeRes = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle.trim(), contentType: "MODULE", visibility: "PUBLIC" }),
    });
    if (!treeRes.ok) { setCreating(false); return; }
    const tree = await treeRes.json();

    // 2. Create the first document (same title)
    const docRes = await fetch(`/api/trees/${tree.slug}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle.trim(), treeId: tree.id }),
    });
    if (!docRes.ok) { setCreating(false); return; }
    const doc = await docRes.json();

    // 3. Attach to this kernel
    const attRes = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: tree.id }),
    });
    if (attRes.ok) {
      const newAtt = await attRes.json();
      setItems((prev) => [...prev, newAtt]);
    }

    // 4. Go straight to the section editor
    const ownerUsernameForNav = session?.user?.username ?? session?.user?.name ?? "";
    router.push(`/${ownerUsernameForNav}/${tree.slug}/${doc.slug}`);
  }

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
    // optimistic
    setItems((prev) => prev.filter((a) => a.id !== attachmentId));
    await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
  }

  function toggleCreate() {
    setShowCreate((v) => !v);
    setShowSearch(false);
    setCreateTitle("");
  }

  function toggleSearch() {
    setShowSearch((v) => !v);
    setShowCreate(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
            {meta.icon} {meta.plural}
          </span>
          <span className="text-sm text-text-subtle">{items.length}</span>
        </div>

        {canAdd && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSearch}
              className={`flex items-center gap-1 text-xs border px-2.5 py-1.5 rounded-lg transition-colors ${
                showSearch
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-border text-text-muted hover:border-green-200 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Adjuntar
            </button>
            <button
              onClick={toggleCreate}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                showCreate
                  ? "bg-green-800 text-white"
                  : "bg-green-700 text-white hover:bg-green-800"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && canAdd && (
        <form onSubmit={handleCreate}
          className="bg-surface rounded-xl border border-green-200 p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1 font-medium">
              Título del {meta.label.toLowerCase()} *
            </label>
            <input
              autoFocus
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
          </div>
          <p className="text-xs text-text-subtle flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Se crearán las 10 secciones automáticamente. Vas a ir directo al editor.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-sm text-text-muted px-3 py-1.5 rounded-lg hover:bg-bg">
              Cancelar
            </button>
            <button type="submit" disabled={creating || !createTitle.trim()}
              className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50 flex items-center gap-1.5">
              {creating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando...</>
                : <><FileText className="w-3.5 h-3.5" /> Crear y abrir editor</>}
            </button>
          </div>
        </form>
      )}

      {/* Search existing */}
      {showSearch && canAdd && (
        <div className="bg-surface rounded-xl border border-green-200 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${meta.label.toLowerCase()}s públicos...`}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-green-400"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle animate-spin" />}
          </div>

          {results.length === 0 && !searching && (
            <p className="text-xs text-text-subtle text-center py-3">
              {query ? "Sin resultados." : `Escribí para buscar ${meta.label.toLowerCase()}s.`}
            </p>
          )}

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {results.map((tree) => (
              <div key={tree.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border-subtle hover:border-green-200 hover:bg-green-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text text-sm truncate">{tree.title}</p>
                  <p className="text-xs text-text-subtle">
                    {tree.owner.username ? `@${tree.owner.username}` : tree.owner.name}
                    {" · "}❤ {tree._count.likes} · ⑂ {tree._count.forks}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/${tree.owner.username ?? tree.owner.name ?? tree.id}/${tree.slug}`} target="_blank"
                    className="p-1 text-text-subtle hover:text-green-700" title="Ver">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => attach(tree.id)}
                    disabled={attaching === tree.id}
                    className="text-xs bg-green-700 text-white px-2.5 py-1 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-1">
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
        <div className="bg-surface rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-subtle">
          {meta.emptyText}
          {canAdd && <span className="block mt-0.5 text-xs">{meta.hint}</span>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((att) => (
            <div key={att.id}
              className="relative bg-surface rounded-xl border border-border p-4 hover:border-green-300 transition-colors group flex flex-col gap-2">
              <Link href={`/${att.content.owner.username ?? att.content.owner.name ?? att.content.id}/${att.content.slug}`} className="absolute inset-0 rounded-xl" aria-label={att.content.title} />

              {/* Title row with detach button always visible */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-text text-sm group-hover:text-green-700 transition-colors line-clamp-2 flex-1">
                  {att.content.title}
                </p>
                <button
                  onClick={() => detach(att.id, att.content.id)}
                  className="relative z-10 shrink-0 p-1.5 text-text-subtle hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Desadjuntar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-text-subtle">
                {att.content.owner.username ? `@${att.content.owner.username}` : att.content.owner.name}
              </p>
              <div className="flex items-center gap-3 text-xs text-text-subtle">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{att.content._count.likes}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{att.content._count.forks}</span>
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
  ownerUsername,
  initialAttachments,
  isOwner,
  isKernel,
}: {
  kernelSlug: string;
  kernelId: string;
  ownerUsername: string;
  initialAttachments: Attachment[];
  isOwner: boolean;
  isKernel: boolean;
}) {
  // Only show MODULE type — RESOURCE type is standalone and not attached to kernels
  const modules = initialAttachments.filter((a) => a.content.contentType === "MODULE");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Módulos</h2>
      <AttachSection
        kernelSlug={kernelSlug}
        kernelId={kernelId}
        initialItems={modules}
        canAdd={isKernel && isOwner}
      />
    </div>
  );
}
