"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ChevronRight, BookOpen } from "lucide-react";
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
  treeSlug:      string;
  ownerUsername: string;
  isOwner:       boolean;
  style:         ContentTypeStyle;
  initialDocs:   DocCard[];
}

export function QuickAddDocument({ treeSlug, ownerUsername, isOwner, style, initialDocs }: Props) {
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
        isDraft: true, progress: 0, sections: [] },
    ]);
    setTitle("");
    setShowForm(false);
    setAdding(false);

    // Navigate to the new document
    router.push(`/${ownerUsername}/${treeSlug}/${data.slug}`);
  }

  const completedCount = (doc: DocCard) => doc.sections.filter((s) => s.isComplete).length;
  const totalCount     = (doc: DocCard) => doc.sections.length;

  return (
    <div className="space-y-3">

      {/* ── Empty state ── */}
      {docs.length === 0 && !showForm && (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-border-subtle flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 text-text-subtle" />
          </div>
          <div>
            <p className="font-medium text-text">Todavía no hay documentos</p>
            <p className="text-sm text-text-subtle mt-0.5">
              Agregá el primer documento para empezar a organizar el contenido.
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowForm(true)}
              className={`inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-colors ${style.btnCls}`}
            >
              <Plus className="w-4 h-4" />
              Nuevo documento
            </button>
          )}
        </div>
      )}

      {/* ── Document cards ── */}
      {docs.map((doc, idx) => {
        const done  = completedCount(doc);
        const total = totalCount(doc);

        return (
          <Link
            key={doc.id}
            href={`/${ownerUsername}/${treeSlug}/${doc.slug}`}
            className="bg-surface rounded-2xl border border-border p-5 hover:border-gray-300 hover:shadow-sm transition-all block group"
          >
            <div className="flex items-start gap-4">
              {/* Number circle */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold mt-0.5 ${style.iconBgCls}`}>
                {idx + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 justify-between">
                  <h3 className={`font-semibold text-text text-base leading-snug ${style.groupHoverTextCls} transition-colors`}>
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.isDraft && isOwner && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Borrador
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-300 ${style.groupHoverTextCls} transition-colors`} />
                  </div>
                </div>

                {/* Progress */}
                {total > 0 ? (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-subtle">
                        {done === total
                          ? <span className="text-primary font-medium">✓ Todo completo</span>
                          : <>{done} de {total} sección{total !== 1 ? "es" : ""} completa{done !== 1 ? "s" : ""}</>
                        }
                      </span>
                      <span className="text-xs text-text-subtle">{doc.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
                      <div
                        className={`${style.progressCls} h-full rounded-full transition-all`}
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-subtle mt-1.5">Sin secciones todavía</p>
                )}
              </div>
            </div>
          </Link>
        );
      })}

      {/* ── Inline add form ── */}
      {isOwner && (
        showForm ? (
          <form
            onSubmit={handleSubmit}
            className={`rounded-2xl border-2 border-dashed ${style.accentBorderCls} bg-surface p-5 space-y-3`}
          >
            <label className="block text-sm font-medium text-text">
              Nombre del documento
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setShowForm(false), setTitle(""), setError(""))}
              placeholder="Ej: Introducción, Unidad 1, Clase 3…"
              className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-current ${style.textCls} placeholder-gray-300 text-text`}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setTitle(""); setError(""); }}
                className="text-sm text-text-muted px-4 py-2 rounded-xl hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding || !title.trim()}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl disabled:opacity-50 transition-colors ${style.btnCls}`}
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Creando…" : "Crear documento"}
              </button>
            </div>
          </form>
        ) : docs.length > 0 ? (
          /* Add button — card style */
          <button
            onClick={() => setShowForm(true)}
            className={`w-full flex items-center justify-center gap-2.5 text-sm border-2 border-dashed border-border rounded-2xl py-4 transition-all ${style.hoverTextCls} ${style.hoverBorderCls} text-text-subtle hover:bg-bg`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${style.lightBgCls}`}>
              <Plus className={`w-3.5 h-3.5 ${style.textCls}`} />
            </div>
            Nuevo documento
          </button>
        ) : null
      )}
    </div>
  );
}
