"use client";

import { useState } from "react";
import { Upload, Loader2, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

interface Props {
  treeSlug:       string;
  contentType:    ContentType;
  initialPublicId: string | null;
  hasChanges:     boolean;
}

export function TreePublishButton({
  treeSlug,
  contentType,
  initialPublicId,
  hasChanges: initialHasChanges,
}: Props) {
  const style = CONTENT_TYPE_STYLE[contentType];

  const [publicId, setPublicId]       = useState<string | null>(initialPublicId);
  const [hasChanges, setHasChanges]   = useState(initialHasChanges);
  const [showModal, setShowModal]     = useState(false);
  const [commitMsg, setCommitMsg]     = useState("");
  const [publishing, setPublishing]   = useState(false);
  const [error, setError]             = useState("");

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setError("");

    const res  = await fetch(`/api/trees/${treeSlug}/publish`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ commitMessage: commitMsg }),
    });
    const data = await res.json();

    if (res.ok) {
      setPublicId(data.publicId);
      setHasChanges(false);
      setShowModal(false);
      setCommitMsg("");
    } else {
      setError(data.error ?? "Error al publicar");
    }
    setPublishing(false);
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Public ID chip */}
        {publicId ? (
          <Link
            href={`/v/${publicId}`}
            className={`flex items-center gap-1.5 font-mono text-xs ${style.lightBgCls} ${style.textCls} px-2.5 py-1.5 rounded-lg border border-transparent hover:border-current transition-all`}
          >
            {publicId}
            <ExternalLink className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-xs text-text-subtle">Sin publicar</span>
        )}

        {/* Publish button */}
        {hasChanges && (
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${style.btnCls}`}
          >
            <Upload className="w-3.5 h-3.5" />
            Publicar
          </button>
        )}
        {!hasChanges && publicId && (
          <span className={`text-xs font-medium ${style.textCls}`}>✓ Publicado</span>
        )}
      </div>

      {/* Publish modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Publicar {style.label?.toLowerCase() ?? "contenido"}
              </h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="text-text-subtle hover:text-text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted">
              Se genera un ID único para esta versión. Cualquiera puede usarlo para
              verificar exactamente qué contenido estaba publicado en este momento.
            </p>

            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Descripción del cambio <span className="font-normal text-text-subtle">(opcional)</span>
                </label>
                <textarea
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Ej: Actualicé los objetivos de la unidad 2"
                  rows={2}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(""); }}
                  className="text-sm text-text-muted px-4 py-2 rounded-xl hover:bg-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl disabled:opacity-50 transition-colors ${style.btnCls}`}
                >
                  {publishing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                    : <><Upload className="w-4 h-4" /> Publicar</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
