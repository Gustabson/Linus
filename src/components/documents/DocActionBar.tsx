"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Trash2, Upload, Loader2, X,
  FileText, AlertTriangle, ChevronRight,
} from "lucide-react";

interface Props {
  treeSlug:      string;
  treeTitle:     string;
  docSlug:       string;
  docTitle:      string;
  ownerUsername: string;
}

type ImportState =
  | { step: "idle" }
  | { step: "uploading" }
  | { step: "needsTitle"; blobUrl: string }
  | { step: "done"; count: number }
  | { step: "error"; message: string };

export function DocActionBar({ treeSlug, treeTitle, docSlug, docTitle, ownerUsername }: Props) {
  const router = useRouter();

  // ── Delete state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  // ── Import state ──────────────────────────────────────────────────────────
  const [importState, setImportState] = useState<ImportState>({ step: "idle" });
  const [embedTitle, setEmbedTitle]   = useState("");
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBack() {
    // Invalidate router cache before navigating so the kernel page re-fetches
    router.refresh();
    router.push(`/${ownerUsername}/${treeSlug}`);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      router.push(`/${ownerUsername}/${treeSlug}`);
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert("No se pudo eliminar el documento.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

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
      {/* ── Row 1: breadcrumb ── */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>{treeTitle}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-text-muted">{docTitle}</span>
      </button>

      {/* ── Row 2: title + actions ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-text leading-tight">{docTitle}</h1>

        <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 text-sm text-text-muted border border-border px-3 py-2 rounded-xl hover:bg-bg hover:border-gray-300 disabled:opacity-50 transition-colors"
            >
              {importState.step === "uploading"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Upload  className="w-4 h-4" />
              }
              <span className="hidden sm:inline">
                {importState.step === "uploading" ? "Importando…" : "Subir Word / PDF"}
              </span>
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-500 border border-red-100 px-3 py-2 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      </div>

      {/* ── Import feedback ── */}
      {importState.step === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0" />
          Se crearon <strong>{importState.count}</strong> sección{importState.count !== 1 ? "es" : ""} a partir del archivo. Podés editarlas abajo.
        </div>
      )}

      {importState.step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {importState.message}
          </span>
          <button onClick={() => setImportState({ step: "idle" })} className="shrink-0 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importState.step === "needsTitle" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            Este PDF no tiene texto seleccionable (imagen escaneada). Se va a mostrar incrustado — ponele un nombre a la sección:
          </p>
          <form onSubmit={handleEmbedSubmit} className="flex gap-2">
            <input
              autoFocus
              value={embedTitle}
              onChange={(e) => setEmbedTitle(e.target.value)}
              placeholder="Ej: Material de lectura"
              className="flex-1 border border-amber-200 bg-surface rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!embedTitle.trim()}
              className="bg-amber-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setImportState({ step: "idle" })}
              className="text-text-muted px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-2xl shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-text text-lg">Eliminar documento</h2>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  ¿Eliminar{" "}
                  <span className="font-semibold text-text">"{docTitle}"</span>?{" "}
                  Se perderán todas las secciones y el historial. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="text-sm text-text-muted px-4 py-2.5 rounded-xl hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
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
