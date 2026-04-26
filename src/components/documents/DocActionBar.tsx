"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Upload, Loader2, X, FileText, AlertTriangle } from "lucide-react";

interface Props {
  treeSlug: string;
  docSlug:  string;
  docTitle: string;
}

type ImportState =
  | { step: "idle" }
  | { step: "uploading" }
  | { step: "needsTitle"; blobUrl: string }
  | { step: "done"; count: number }
  | { step: "error"; message: string };

export function DocActionBar({ treeSlug, docSlug, docTitle }: Props) {
  const router = useRouter();

  // ── Delete state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  // ── Import state ──────────────────────────────────────────────────────────
  const [importState, setImportState] = useState<ImportState>({ step: "idle" });
  const [embedTitle, setEmbedTitle]   = useState("");
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/t/${treeSlug}`);
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert("No se pudo eliminar el documento.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    setImportState({ step: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    const res  = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, {
      method: "POST",
      body:   formData,
    });
    const data = await res.json();

    if (!res.ok) {
      setImportState({ step: "error", message: data.error ?? "Error al importar." });
      return;
    }

    if (data.needsTitle) {
      setImportState({ step: "needsTitle", blobUrl: data.blobUrl });
      return;
    }

    setImportState({ step: "done", count: data.count });
    // Reload page so the new sections appear
    setTimeout(() => {
      router.refresh();
      setImportState({ step: "idle" });
    }, 1500);
  }

  async function handleEmbedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (importState.step !== "needsTitle") return;
    if (!embedTitle.trim()) return;

    setImportState({ step: "uploading" });

    const formData = new FormData();
    formData.append("blobUrl",      importState.blobUrl);
    formData.append("sectionTitle", embedTitle.trim());

    const res  = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, {
      method: "POST",
      body:   formData,
    });
    const data = await res.json();

    if (!res.ok) {
      setImportState({ step: "error", message: data.error ?? "Error al guardar." });
      return;
    }

    setImportState({ step: "done", count: 1 });
    setEmbedTitle("");
    setTimeout(() => {
      router.refresh();
      setImportState({ step: "idle" });
    }, 1500);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <span className="text-gray-200 select-none">|</span>

        {/* Title (subtle) */}
        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{docTitle}</span>

        <div className="flex-1" />

        {/* Upload Word/PDF */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importState.step === "uploading"}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {importState.step === "uploading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />
            }
            <span className="hidden sm:inline">
              {importState.step === "uploading" ? "Importando…" : "Subir Word/PDF"}
            </span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 text-sm text-red-500 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Eliminar</span>
        </button>
      </div>

      {/* Import feedback strip */}
      {importState.step === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0" />
          Se crearon {importState.count} sección{importState.count !== 1 ? "es" : ""} a partir del archivo. Podés editarlas abajo.
        </div>
      )}

      {importState.step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {importState.message}
          </span>
          <button onClick={() => setImportState({ step: "idle" })} className="shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF embed title form */}
      {importState.step === "needsTitle" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            Este PDF no tiene texto seleccionable (es una imagen escaneada). Se va a mostrar incrustado — poné un título para la sección:
          </p>
          <form onSubmit={handleEmbedSubmit} className="flex gap-2">
            <input
              autoFocus
              value={embedTitle}
              onChange={(e) => setEmbedTitle(e.target.value)}
              placeholder="Ej: Contenido del documento"
              className="flex-1 border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!embedTitle.trim()}
              className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setImportState({ step: "idle" })}
              className="text-gray-500 px-3 py-2 rounded-lg hover:bg-amber-100"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Eliminar documento</h2>
                <p className="text-sm text-gray-500 mt-1">
                  ¿Eliminar <span className="font-medium text-gray-900">"{docTitle}"</span>?
                  Esta acción no se puede deshacer — se pierden todas las secciones y el historial.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
