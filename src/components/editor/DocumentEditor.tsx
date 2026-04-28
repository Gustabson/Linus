"use client";

import { useState } from "react";
import { Plus, Loader2, LayoutList } from "lucide-react";
import { SectionCard } from "./SectionCard";
import type { DocumentSection } from "@prisma/client";

interface DocumentEditorProps {
  treeSlug:        string;
  docSlug:         string;
  versionId:       string | null;
  sections:        DocumentSection[];
  isOwner:         boolean;
  isAuthenticated: boolean;
  onQuote?:        (text: string, sectionTitle: string) => void;
}

type SectionIdMap = Record<string, string>;

function applySectionIdMap(sections: DocumentSection[], map: SectionIdMap): DocumentSection[] {
  if (!Object.keys(map).length) return sections;
  return sections.map((s) => ({ ...s, id: map[s.id] ?? s.id }));
}

export function DocumentEditor({
  treeSlug,
  docSlug,
  sections: initialSections,
  isOwner,
  isAuthenticated,
  onQuote,
}: DocumentEditorProps) {
  const [sections, setSections] = useState<DocumentSection[]>(initialSections);
  const [openId, setOpenId]     = useState<string>(initialSections[0]?.id ?? "");
  const [showAdd, setShowAdd]   = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding]     = useState(false);

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
      setSections((prev) => [
        ...applySectionIdMap(prev, data.sectionIdMap ?? {}),
        {
          id: data.id, sectionType: data.sectionType, sectionOrder: data.sectionOrder,
          isComplete: false, richTextContent: data.richTextContent,
          difficultyLevel: data.difficultyLevel, ageRangeMin: null, ageRangeMax: null,
          gradeLevel: null, durationMinutes: null, createdAt: new Date(), versionId: data.versionId,
        } as DocumentSection,
      ]);
      setOpenId(data.id);
      setNewTitle("");
      setShowAdd(false);
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
      setSections((prev) => applySectionIdMap(prev.filter((s) => s.id !== sectionId), map));
      if (openId === sectionId) setOpenId("");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Empty state ── */}
      {sections.length === 0 && !showAdd && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto">
            <LayoutList className="w-7 h-7 text-gray-300" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Este documento no tiene secciones</p>
            <p className="text-sm text-gray-400 mt-1">
              Las secciones son las partes del documento: introducción, objetivos, actividades, etc.
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Agregar primera sección
            </button>
          )}
        </div>
      )}

      {/* ── Section list ── */}
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

      {/* ── Add section form ── */}
      {showAdd && isOwner && (
        <form
          onSubmit={handleAddSection}
          className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Nombre de la sección
            </label>
            <p className="text-xs text-gray-400">
              Describí de qué trata esta parte del documento.
            </p>
          </div>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setShowAdd(false), setNewTitle(""))}
            placeholder="Ej: Introducción, Objetivos, Actividades…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewTitle(""); }}
              className="text-sm text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? "Agregando…" : "Agregar sección"}
            </button>
          </div>
        </form>
      )}

      {/* ── Add section button (card-style, only when sections exist) ── */}
      {isOwner && sections.length > 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2.5 text-sm text-gray-400 hover:text-gray-700 border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-2xl py-4 transition-all group"
        >
          <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </div>
          Agregar sección
        </button>
      )}

    </div>
  );
}
