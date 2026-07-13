"use client";

import { useState, useRef } from "react";
import { useRouter } from "@/hooks/useAppRouter";
import {
  ArrowLeft, Trash2, Upload, Loader2, X,
  FileText, AlertTriangle, Pencil, Check,
} from "lucide-react";
import { DocExportButton, type ExportSection } from "./DocExportButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  treeSlug:       string;
  treeTitle:      string;
  docSlug:        string;
  docTitle:       string;
  ownerUsername:  string;
  exportSections?: ExportSection[];
}

type ImportState =
  | { step: "idle" }
  | { step: "choosingMode"; file: File }
  | { step: "uploading" }
  | { step: "needsTitle"; blobUrl: string; uploadToken: string }
  | { step: "done"; count: number }
  | { step: "error"; message: string };

export function DocActionBar({ treeSlug, treeTitle, docSlug, docTitle, ownerUsername, exportSections }: Props) {
  const router = useRouter();

  // ── Doc title inline edit ─────────────────────────────────────────────────
  const [titleValue,    setTitleValue]    = useState(docTitle);
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [savingTitle,   setSavingTitle]   = useState(false);
  const titleInputRef                     = useRef<HTMLInputElement>(null);
  const savedTitleRef                     = useRef(docTitle);
  const [actionError, setActionError]      = useState("");

  async function commitTitle() {
    const trimmed = titleValue.trim();
    if (!trimmed) { setTitleValue(savedTitleRef.current); setEditingTitle(false); return; }
    if (trimmed === savedTitleRef.current) { setEditingTitle(false); return; }
    setSavingTitle(true);
    setActionError("");
    try {
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo renombrar el documento");
      savedTitleRef.current = trimmed;
      setTitleValue(trimmed);
    } catch (error) {
      setTitleValue(savedTitleRef.current);
      setActionError(error instanceof Error ? error.message : "No se pudo renombrar el documento");
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  function startEditTitle() {
    setEditingTitle(true);
    setTimeout(() => { titleInputRef.current?.select(); }, 0);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitTitle(); }
    if (e.key === "Escape") { setTitleValue(savedTitleRef.current); setEditingTitle(false); }
  }

  // ── Delete state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);
  const [deleteError, setDeleteError]             = useState("");

  // ── Import state ──────────────────────────────────────────────────────────
  const [importState, setImportState] = useState<ImportState>({ step: "idle" });
  const [embedTitle, setEmbedTitle]   = useState("");
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBack() {
    router.refresh();
    router.push(`/${ownerUsername}/${treeSlug}`);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar el documento");
      router.push(`/${ownerUsername}/${treeSlug}`);
      router.refresh();
    } catch (error) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el documento");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportState({ step: "choosingMode", file });
  }

  async function uploadFile(file: File, mode: "split" | "single") {
    setImportState({ step: "uploading" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al importar.");
      if (data.needsTitle) {
        if (typeof data.blobUrl !== "string" || typeof data.uploadToken !== "string") throw new Error("Respuesta de importación inválida.");
        setImportState({ step: "needsTitle", blobUrl: data.blobUrl, uploadToken: data.uploadToken });
        return;
      }
      setImportState({ step: "done", count: Number(data.count) || 0 });
      setTimeout(() => { router.refresh(); setImportState({ step: "idle" }); }, 1500);
    } catch (error) {
      setImportState({ step: "error", message: error instanceof Error ? error.message : "Error al importar." });
    }
  }

  async function handleEmbedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (importState.step !== "needsTitle") return;
    if (!embedTitle.trim()) return;

    setImportState({ step: "uploading" });

    const formData = new FormData();
    formData.append("blobUrl",      importState.blobUrl);
    formData.append("uploadToken",  importState.uploadToken);
    formData.append("sectionTitle", embedTitle.trim());

    try {
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setImportState({ step: "done", count: 1 });
      setEmbedTitle("");
      setTimeout(() => { router.refresh(); setImportState({ step: "idle" }); }, 1500);
    } catch (error) {
      setImportState({ step: "error", message: error instanceof Error ? error.message : "Error al guardar." });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Row 1: breadcrumb ── */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span>Volver</span>
      </button>

      {/* ── Row 2: title + actions ── */}
      <div className="flex flex-col gap-3">
        {/* ── Title row ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Editable title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKeyDown}
                className="text-2xl font-bold text-text bg-transparent border-b-2 border-gray-900 focus:outline-none flex-1 min-w-0 pb-0.5 leading-tight"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); commitTitle(); }}
                disabled={savingTitle}
                className="shrink-0 p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold text-text leading-tight truncate">{titleValue}</h1>
              <button
                onClick={startEditTitle}
                title="Renombrar"
                className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        </div>

        {/* ── Actions row (below title on mobile) ── */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Upload Word/PDF */}
          <div className="relative">
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState.step === "uploading"}
              className="flex items-center gap-2 text-sm text-text-muted border border-border px-3 py-2 rounded-xl hover:bg-bg hover:border-gray-300 disabled:opacity-50 transition-colors"
            >
              {importState.step === "uploading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>
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
            <span>Eliminar</span>
          </button>

          {/* Export */}
          {exportSections !== undefined && (
            <DocExportButton
              title={titleValue}
              sections={exportSections}
              treeSlug={treeSlug}
              docSlug={docSlug}
            />
          )}
        </div>
      </div>

      {/* ── Import mode chooser ── */}
      {importState.step === "choosingMode" && (
        <div className="bg-bg border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0 text-text-muted" />
              <span className="truncate max-w-[240px]">{importState.file.name}</span>
            </p>
            <button onClick={() => setImportState({ step: "idle" })} className="shrink-0 text-text-muted hover:text-text transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-text-muted">¿Cómo querés importar el contenido?</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => uploadFile(importState.file, "split")}
              className="flex-1 min-w-[140px] flex flex-col items-center gap-1.5 border border-border rounded-xl px-4 py-3 text-sm text-text hover:bg-surface hover:border-primary/40 transition-colors text-center"
            >
              <span className="font-medium">Dividir en secciones</span>
              <span className="text-xs text-text-muted">Detecta títulos automáticamente</span>
            </button>
            <button
              onClick={() => uploadFile(importState.file, "single")}
              className="flex-1 min-w-[140px] flex flex-col items-center gap-1.5 border border-border rounded-xl px-4 py-3 text-sm text-text hover:bg-surface hover:border-primary/40 transition-colors text-center"
            >
              <span className="font-medium">Una sola sección</span>
              <span className="text-xs text-text-muted">Todo el contenido junto</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Import feedback ── */}
      {importState.step === "done" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary flex items-center gap-2">
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

      {deleteError && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {actionError}
        </p>
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
            <button type="submit" disabled={!embedTitle.trim()} className="bg-amber-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors">
              Agregar
            </button>
            <button type="button" onClick={() => setImportState({ step: "idle" })} className="text-text-muted px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Eliminar documento"
          description={<>¿Eliminar <strong className="text-text">“{titleValue}”</strong>? Se perderán todas las secciones y el historial.</>}
          confirmLabel="Eliminar documento"
          busy={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}
