"use client";

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Circle, Save, Quote, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEditor } from "./SectionEditor";
import { SectionMetaFields } from "./SectionMetaFields";
import type { DocumentSection } from "@prisma/client";

interface SectionCardProps {
  section: DocumentSection;
  index: number;
  isOpen: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  onToggle: () => void;
  onSave: (sectionId: string, content: object, meta: Record<string, string | number | null>) => Promise<void>;
  onRename: (sectionId: string, newTitle: string) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
  onQuote?: (text: string, sectionTitle: string) => void;
}

export function SectionCard({
  section,
  index,
  isOpen,
  isOwner,
  isAuthenticated,
  onToggle,
  onSave,
  onRename,
  onDelete,
  onQuote,
}: SectionCardProps) {
  const [content, setContent]           = useState<object | null>(null);
  const [meta, setMeta]                 = useState<Record<string, string | number | null>>({});
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue]     = useState(section.sectionType);
  const titleInputRef                   = useRef<HTMLInputElement>(null);

  const isDirty = content !== null;

  function handleMetaChange(field: string, value: string | number | null) {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    await onSave(section.id, content, meta);
    setSaving(false);
    setSaved(true);
    setContent(null);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(section.id);
  }

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

  async function commitTitle() {
    const trimmed = titleValue.trim();
    if (!trimmed) { setTitleValue(section.sectionType); setEditingTitle(false); return; }
    if (trimmed !== section.sectionType) await onRename(section.id, trimmed);
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitTitle(); }
    if (e.key === "Escape") { setTitleValue(section.sectionType); setEditingTitle(false); }
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border transition-all",
      isOpen ? "border-green-300 shadow-sm" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-5 py-4 text-left"
        >
          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Editable title — only when open and owner */}
            {isOwner && isOpen && editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-gray-900 bg-transparent border-b border-green-400 focus:outline-none min-w-0 flex-1"
              />
            ) : (
              <span className="font-medium text-gray-900 truncate">{titleValue}</span>
            )}
            {section.isComplete
              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              : <Circle      className="w-4 h-4 text-gray-300 shrink-0" />}
            {isDirty && !saved && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                Sin guardar
              </span>
            )}
            {/* Rename button — only when open and owner */}
            {isOwner && isOpen && !editingTitle && (
              <button
                type="button"
                title="Renombrar sección"
                onClick={startEditTitle}
                className="p-1 text-gray-300 hover:text-green-600 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </button>

        {/* Actions */}
        {isOwner && (
          <div className="pr-4 flex items-center gap-2 shrink-0">
            {confirmDelete ? (
              <>
                <span className="text-xs text-red-600">¿Eliminar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "..." : "Sí"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar sección"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        )}
        {!isOwner && (
          <div className="pr-5">
            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        )}
      </div>

      {/* Body */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4">
          {isOwner && (
            <SectionMetaFields
              difficultyLevel={section.difficultyLevel}
              ageRangeMin={section.ageRangeMin}
              ageRangeMax={section.ageRangeMax}
              durationMinutes={section.durationMinutes}
              onChange={handleMetaChange}
            />
          )}

          {(section.richTextContent as Record<string, unknown>)?.__type === "pdf_embed" ? (
            /* PDF embed section — show iframe, not TipTap editor */
            <div className="space-y-2">
              <iframe
                src={(section.richTextContent as Record<string, unknown>).url as string}
                className="w-full rounded-xl border border-gray-200"
                style={{ height: "600px" }}
                title={section.sectionType}
              />
              {isOwner && (
                <p className="text-xs text-gray-400 text-center">
                  PDF incrustado — no se puede editar directamente
                </p>
              )}
            </div>
          ) : (
            <SectionEditor
              content={section.richTextContent as object ?? null}
              placeholder={`Escribí el contenido de "${titleValue}"...`}
              editable={isOwner}
              onChange={setContent}
            />
          )}

          {/* Save button — not shown for PDF embeds */}
          {isOwner && (isDirty || saved) && (section.richTextContent as Record<string, unknown>)?.__type !== "pdf_embed" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className={cn(
                  "flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors",
                  saved
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                )}
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar"}
              </button>
            </div>
          )}

          {/* Quote for non-owners */}
          {!isOwner && isAuthenticated && onQuote && section.richTextContent && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const extractText = (node: Record<string, unknown>): string => {
                    if (node.type === "text") return (node.text as string) ?? "";
                    if (Array.isArray(node.content)) {
                      return (node.content as Record<string, unknown>[]).map(extractText).join(" ");
                    }
                    return "";
                  };
                  const text = extractText(section.richTextContent as Record<string, unknown>).trim().slice(0, 300);
                  if (text) onQuote(text, titleValue);
                }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-700 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Quote className="w-3 h-3" />
                Citar y comentar
              </button>
            </div>
          )}

          {!isOwner && !isAuthenticated && (
            <p className="text-center text-sm text-gray-400 py-2">
              <a href="/login" className="text-green-700 hover:underline">Iniciá sesión</a>{" "}
              para forkear y editar este currículo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
