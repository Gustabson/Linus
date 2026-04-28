"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ContentTypeStyle } from "@/lib/constants";

interface DocCard {
  id:       string;
  slug:     string;
  title:    string;
  isDraft:  boolean;
  progress: number;
  sections: { id: string; sectionType: string; isComplete: boolean }[];
}

interface Props {
  treeSlug: string;
  isOwner:  boolean;
  style:    ContentTypeStyle;
  initialDocs: DocCard[];
}

export function QuickAddDocument({ treeSlug, isOwner, style, initialDocs }: Props) {
  const router = useRouter();

  const [docs, setDocs]         = useState<DocCard[]>(initialDocs);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    setError("");

    const res  = await fetch(`/api/trees/${treeSlug}/documents`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el documento.");
      setAdding(false);
      return;
    }

    // Optimistically add to local list
    setDocs((prev) => [
      ...prev,
      { id: data.id, slug: data.slug, title: title.trim(),
        isDraft: false, progress: 0, sections: [] },
    ]);
    setTitle("");
    setShowForm(false);
    setAdding(false);

    // Navigate to the new document to start editing
    router.push(`/t/${treeSlug}/${data.slug}`);
  }

  return (
    <div className="space-y-2">
      {/* Document cards */}
      {docs.length === 0 && !showForm ? (
        <div className={`rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400`}>
          <p className="text-sm">Todavía no hay documentos.</p>
        </div>
      ) : (
        docs.map((doc) => (
          <Link
            key={doc.id}
            href={`/t/${treeSlug}/${doc.slug}`}
            className={`bg-gray-50 rounded-xl border border-gray-100 p-4 ${style.hoverBorderCls} hover:bg-white transition-all block group`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className={`font-medium text-gray-900 text-sm ${style.groupHoverTextCls}`}>
                  {doc.title}
                </h3>
                {doc.isDraft && isOwner && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    Borrador
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
            {doc.sections.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1 mb-2">
                  {doc.sections.map((s) => (
                    <span
                      key={s.id}
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        s.isComplete ? style.badgeCls : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {s.sectionType}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1">
                    <div
                      className={`${style.progressCls} h-1 rounded-full transition-all`}
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{doc.progress}%</span>
                </div>
              </>
            )}
          </Link>
        ))
      )}

      {/* Inline add form */}
      {isOwner && (
        showForm ? (
          <form
            onSubmit={handleSubmit}
            className={`rounded-xl border-2 border-dashed ${style.accentBorderCls} bg-white p-4 flex items-center gap-2`}
          >
            <Plus className={`w-4 h-4 shrink-0 ${style.textCls}`} />
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la temática…"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
            />
            {error && <span className="text-xs text-red-500 shrink-0">{error}</span>}
            <button
              type="submit"
              disabled={adding || !title.trim()}
              className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors ${style.btnCls}`}
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {adding ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setTitle(""); setError(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className={`w-full flex items-center justify-center gap-2 text-sm text-gray-400 ${style.hoverTextCls} border border-dashed border-gray-200 ${style.hoverBorderCls} rounded-xl py-3 transition-colors`}
          >
            <Plus className="w-4 h-4" />
            Nueva temática
          </button>
        )
      )}
    </div>
  );
}
