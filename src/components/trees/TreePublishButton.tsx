"use client";

import { useState } from "react";
import { Upload, Loader2, X, Check, Copy, Shield } from "lucide-react";
import type { ContentType } from "@prisma/client";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

interface Props {
  treeSlug:         string;
  contentType:      ContentType;
  /** SHA-256 hash of the last published version, or null if never published */
  initialHash:      string | null;
  /** Whether the tree has at least one DRAFT document version (unpublished changes) */
  hasChanges:       boolean;
}

export function TreePublishButton({
  treeSlug,
  contentType,
  initialHash,
  hasChanges: initialHasChanges,
}: Props) {
  const style = CONTENT_TYPE_STYLE[contentType];

  const [hash, setHash]               = useState<string | null>(initialHash);
  const [hasChanges, setHasChanges]   = useState(initialHasChanges);
  const [showModal, setShowModal]     = useState(false);
  const [commitMsg, setCommitMsg]     = useState("");
  const [publishing, setPublishing]   = useState(false);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setError("");

    const res = await fetch(`/api/trees/${treeSlug}/publish`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ commitMessage: commitMsg }),
    });
    const data = await res.json();

    if (res.ok) {
      setHash(data.contentHash);
      setHasChanges(false);
      setShowModal(false);
      setCommitMsg("");
    } else {
      setError(data.error ?? "Error al publicar");
    }
    setPublishing(false);
  }

  function copyHash() {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* ── Inline strip ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Hash chip */}
        {hash ? (
          <button
            onClick={copyHash}
            title={`Hash completo: ${hash}`}
            className={`group flex items-center gap-1.5 font-mono text-xs ${style.lightBgCls} ${style.textCls} px-2.5 py-1.5 rounded-lg border border-transparent hover:border-current transition-all`}
          >
            <Shield className="w-3 h-3 shrink-0" />
            {hash.slice(0, 12)}…
            {copied
              ? <Check className="w-3 h-3 text-green-600 shrink-0" />
              : <Copy  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            }
          </button>
        ) : (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Sin publicar
          </span>
        )}

        {/* Publish action */}
        {hasChanges ? (
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${style.btnCls}`}
          >
            <Upload className="w-3.5 h-3.5" />
            Publicar
          </button>
        ) : hash ? (
          <span className={`text-xs font-medium ${style.textCls}`}>✓ Publicado</span>
        ) : null}
      </div>

      {/* ── Publish modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-700" />
                Publicar {style.label.toLowerCase()}
              </h2>
              <button
                onClick={() => { setShowModal(false); setError(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Se calcula un hash SHA-256 de todo el contenido y queda registrado en el ledger
              criptográfico. Este hash identifica esta versión de forma permanente y permite
              verificar que no fue modificada.
            </p>

            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del cambio <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Ej: Actualización de objetivos de aprendizaje"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(""); }}
                  className="text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50"
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
