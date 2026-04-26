"use client";

import { useState } from "react";
import { Plus, Loader2, Upload, Check, Copy, X, Shield } from "lucide-react";
import { SectionCard } from "./SectionCard";
import type { DocumentSection } from "@prisma/client";

interface DocumentEditorProps {
  treeSlug:            string;
  docSlug:             string;
  versionId:           string | null;
  sections:            DocumentSection[];
  isOwner:             boolean;
  isAuthenticated:     boolean;
  onQuote?:            (text: string, sectionTitle: string) => void;
  /** "DRAFT" if there are unpublished changes; "PUBLISHED" if last save was a publish */
  versionStatus:       "DRAFT" | "PUBLISHED";
  /** Hash of the most-recently-published version, if any */
  latestPublishedHash: string | null;
}

type SectionIdMap = Record<string, string>;

function applySectionIdMap(sections: DocumentSection[], map: SectionIdMap): DocumentSection[] {
  if (!Object.keys(map).length) return sections;
  return sections.map((s) => ({ ...s, id: map[s.id] ?? s.id }));
}

export function DocumentEditor({
  treeSlug,
  docSlug,
  sections:            initialSections,
  isOwner,
  isAuthenticated,
  onQuote,
  versionStatus,
  latestPublishedHash: initialHash,
}: DocumentEditorProps) {
  const [sections, setSections]           = useState<DocumentSection[]>(initialSections);
  const [openId, setOpenId]               = useState<string>(initialSections[0]?.id ?? "");
  const [showAdd, setShowAdd]             = useState(false);
  const [newTitle, setNewTitle]           = useState("");
  const [adding, setAdding]               = useState(false);

  // ── Publish state ──────────────────────────────────────────────────────────
  const [hasChanges, setHasChanges]       = useState(versionStatus === "DRAFT");
  const [publishedHash, setPublishedHash] = useState<string | null>(initialHash);
  const [showPublish, setShowPublish]     = useState(false);
  const [commitMsg, setCommitMsg]         = useState("");
  const [publishing, setPublishing]       = useState(false);
  const [publishErr, setPublishErr]       = useState("");
  const [copied, setCopied]               = useState(false);

  // ── Section mutations ──────────────────────────────────────────────────────

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      // If the first edit after a publish triggered a fork, remap surviving section IDs
      setSections((prev) => [
        ...applySectionIdMap(prev, data.sectionIdMap ?? {}),
        { id: data.id, sectionType: data.sectionType, sectionOrder: data.sectionOrder,
          isComplete: false, richTextContent: data.richTextContent,
          difficultyLevel: data.difficultyLevel, ageRangeMin: null, ageRangeMax: null,
          gradeLevel: null, durationMinutes: null, createdAt: new Date(), versionId: data.versionId } as DocumentSection,
      ]);
      setOpenId(data.id);
      setNewTitle("");
      setShowAdd(false);
      if (data.draftCreated) setHasChanges(true);
    }
    setAdding(false);
  }

  async function handleSave(
    sectionId:       string,
    richTextContent: object,
    meta:            Record<string, string | number | null>
  ) {
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sectionId, richTextContent, ...meta }),
    });
    if (res.ok) {
      const data = await res.json();
      const map  = data.sectionIdMap ?? {};
      setSections((prev) =>
        applySectionIdMap(prev, map).map((s) => {
          const newId = map[sectionId] ?? sectionId;
          return s.id === newId
            ? { ...s, isComplete: data.isComplete ?? true, richTextContent: richTextContent as never }
            : s;
        })
      );
      if (data.draftCreated) setHasChanges(true);
    }
  }

  async function handleRename(sectionId: string, newSectionTitle: string) {
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sectionId, sectionTitle: newSectionTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      const map  = data.sectionIdMap ?? {};
      setSections((prev) =>
        applySectionIdMap(prev, map).map((s) => {
          const newId = map[sectionId] ?? sectionId;
          return s.id === newId ? { ...s, sectionType: newSectionTitle } : s;
        })
      );
      if (data.draftCreated) setHasChanges(true);
    }
  }

  async function handleDelete(sectionId: string) {
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sectionId }),
    });
    if (res.ok) {
      const data = await res.json();
      const map  = data.sectionIdMap ?? {};
      setSections((prev) =>
        applySectionIdMap(prev.filter((s) => s.id !== sectionId), map)
      );
      if (openId === sectionId) setOpenId("");
      if (data.draftCreated) setHasChanges(true);
    }
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setPublishErr("");
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/publish`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ commitMessage: commitMsg }),
    });
    const data = await res.json();
    if (res.ok) {
      // Remap section IDs to the fresh DRAFT that was created after publish
      if (data.sectionIdMap) {
        setSections((prev) => applySectionIdMap(prev, data.sectionIdMap));
      }
      setPublishedHash(data.contentHash);
      setHasChanges(false);   // new DRAFT is clean (no changes yet)
      setShowPublish(false);
      setCommitMsg("");
    } else {
      setPublishErr(data.error ?? "Error al publicar");
    }
    setPublishing(false);
  }

  function copyHash() {
    if (!publishedHash) return;
    navigator.clipboard.writeText(publishedHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Hash strip (owner only) ── */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-green-600 shrink-0" />
            {publishedHash ? (
              <span className="text-gray-500">
                Versión publicada:{" "}
                <code className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  {publishedHash.slice(0, 16)}…
                </code>
              </span>
            ) : (
              <span className="text-gray-400 text-sm">Todavía no publicado</span>
            )}
            {publishedHash && (
              <button
                onClick={copyHash}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-700 transition-colors ml-1"
                title="Copiar hash completo"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            )}
          </div>

          {hasChanges ? (
            <button
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-1.5 bg-green-700 text-white text-sm px-3 py-1.5 rounded-xl hover:bg-green-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Publicar versión
            </button>
          ) : publishedHash ? (
            <span className="text-xs text-green-700 font-medium">✓ Publicado</span>
          ) : null}
        </div>
      )}

      {/* ── Sections ── */}
      {sections.length === 0 && !showAdd && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">Este documento todavía no tiene secciones.</p>
          {isOwner && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar primera sección
            </button>
          )}
        </div>
      )}

      {sections.map((section, idx) => (
        <SectionCard
          key={section.id}
          section={section}
          index={idx}
          isOpen={openId === section.id}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          onToggle={() => setOpenId(openId === section.id ? "" : section.id)}
          onSave={handleSave}
          onRename={handleRename}
          onDelete={handleDelete}
          onQuote={onQuote}
        />
      ))}

      {isOwner && sections.length > 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-green-700 border border-dashed border-gray-200 hover:border-green-300 rounded-2xl py-4 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar sección
        </button>
      )}

      {showAdd && isOwner && (
        <form
          onSubmit={handleAddSection}
          className="bg-white rounded-2xl border border-green-200 p-5 space-y-3"
        >
          <label className="block text-sm font-medium text-gray-700">Nombre de la sección</label>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ej: Filosofía Educativa, Objetivos, Actividades..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewTitle(""); }}
              className="text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </form>
      )}

      {/* ── Publish modal ── */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-700" />
                Publicar versión
              </h2>
              <button onClick={() => setShowPublish(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Se va a calcular el hash del contenido actual y quedar registrado en el ledger criptográfico.
              Una vez publicado, ese hash identifica esta versión de forma permanente.
            </p>

            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del cambio (opcional)
                </label>
                <textarea
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Ej: Actualización de objetivos de aprendizaje"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none"
                />
              </div>

              {publishErr && <p className="text-sm text-red-600">{publishErr}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowPublish(false)}
                  className="text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
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
    </div>
  );
}
