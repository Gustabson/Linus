"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { SectionCard } from "./SectionCard";
import type { DocumentSection } from "@prisma/client";

interface DocumentEditorProps {
  treeSlug: string;
  docSlug: string;
  versionId: string | null;
  sections: DocumentSection[];
  isOwner: boolean;
  isAuthenticated: boolean;
  onQuote?: (text: string, sectionTitle: string) => void;
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
  const [openId, setOpenId] = useState<string>(initialSections[0]?.id ?? "");

  // Add section state
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const newSection = await res.json();
      setSections((prev) => [...prev, newSection]);
      setOpenId(newSection.id);
      setNewTitle("");
      setShowAdd(false);
    }
    setAdding(false);
  }

  async function handleSave(
    sectionId: string,
    richTextContent: object,
    meta: Record<string, string | number | null>
  ) {
    await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, richTextContent, ...meta }),
    });
    // Mark as complete locally
    setSections((prev) =>
      prev.map((s) => s.id === sectionId ? { ...s, isComplete: true } : s)
    );
  }

  async function handleDelete(sectionId: string) {
    const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId }),
    });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      if (openId === sectionId) setOpenId("");
    }
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && !showAdd && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">
            Este documento todavía no tiene secciones.
          </p>
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
          onDelete={handleDelete}
          onQuote={onQuote}
        />
      ))}

      {/* Add section */}
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
        <form onSubmit={handleAddSection}
          className="bg-white rounded-2xl border border-green-200 p-5 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Nombre de la sección
          </label>
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
    </div>
  );
}
