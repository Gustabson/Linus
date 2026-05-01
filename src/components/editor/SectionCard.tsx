"use client";

import { useState, useRef } from "react";
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  Save, Quote, Trash2, Pencil, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEditor } from "./SectionEditor";
import { SectionMetaFields } from "./SectionMetaFields";
import type { DocumentSection } from "@prisma/client";

interface SectionCardProps {
  section:         DocumentSection;
  index:           number;
  isOpen:          boolean;
  isOwner:         boolean;
  isAuthenticated: boolean;
  onToggle:        () => void;
  onSave:   (sectionId: string, content: object, meta: Record<string, string | number | null>) => Promise<void>;
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
  const [content, setContent]               = useState<object | null>(null);
  const [meta, setMeta]                     = useState<Record<string, string | number | null>>({});
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [editingTitle, setEditingTitle]     = useState(false);
  const [titleValue, setTitleValue]         = useState(section.sectionType);
  const titleInputRef                       = useRef<HTMLInputElement>(null);

  const isDirty   = content !== null;
  const isPdfEmbed = (section.richTextContent as Record<string, unknown>)?.__type === "pdf_embed";

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
      "bg-surface rounded-2xl border transition-all duration-200",
      isOpen
        ? "border-gray-300 shadow-sm"
        : "border-border hover:border-gray-300 hover:shadow-sm"
    )}>

      {/* ── Header ── */}
      <div className="flex items-stretch">

        {/* Toggle area */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-4 px-5 py-4 text-left min-w-0"
        >
          {/* Number badge */}
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold transition-colors",
            isOpen
              ? "bg-gray-900 text-white"
              : "bg-border-subtle text-text-muted"
          )}>
            {index + 1}
          </div>

          {/* Title + status */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isOwner && isOpen && editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-text text-base bg-transparent border-b-2 border-gray-900 focus:outline-none min-w-0 flex-1 pb-0.5"
              />
            ) : (
              <span className="font-semibold text-text text-base truncate leading-snug">
                {titleValue}
              </span>
            )}

            {/* Unsaved indicator */}
            {isDirty && !saved && !saving && (
              <span className="hidden sm:inline text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                Sin guardar
              </span>
            )}
          </div>

          {/* Completion icon + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {section.isComplete
              ? <CheckCircle2 className="w-5 h-5 text-primary" />
              : <Circle       className="w-5 h-5 text-gray-200"  />
            }
            {isOpen
              ? <ChevronUp   className="w-4 h-4 text-text-subtle" />
              : <ChevronDown className="w-4 h-4 text-text-subtle" />
            }
          </div>
        </button>

        {/* Owner actions — only visible when open */}
        {isOwner && isOpen && (
          <div className="flex items-center gap-1 pr-4 border-l border-border-subtle pl-3">
            {!editingTitle && (
              <button
                type="button"
                title="Renombrar"
                onClick={startEditTitle}
                className="p-2 text-gray-300 hover:text-text hover:bg-bg rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium whitespace-nowrap">¿Eliminar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-text-muted px-2 py-1 rounded-lg hover:bg-border-subtle transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar sección"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {isOpen && (
        <div className="border-t border-border-subtle px-5 pb-6 pt-5 space-y-5">

          {/* Metadata (owner only) */}
          {isOwner && (
            <SectionMetaFields
              difficultyLevel={section.difficultyLevel}
              ageRangeMin={section.ageRangeMin}
              ageRangeMax={section.ageRangeMax}
              durationMinutes={section.durationMinutes}
              onChange={handleMetaChange}
            />
          )}

          {/* Content */}
          {isPdfEmbed ? (
            <div className="space-y-2">
              <iframe
                src={(section.richTextContent as Record<string, unknown>).url as string}
                className="w-full rounded-xl border border-border"
                style={{ height: "600px" }}
                title={section.sectionType}
              />
              {isOwner && (
                <p className="text-xs text-text-subtle text-center">
                  PDF incrustado — no se puede editar directamente
                </p>
              )}
            </div>
          ) : (
            <SectionEditor
              content={section.richTextContent as object ?? null}
              placeholder={`Escribí el contenido de "${titleValue}"…`}
              editable={isOwner}
              onChange={setContent}
            />
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Quote for non-owners */}
            {!isOwner && isAuthenticated && onQuote && section.richTextContent && (
              <button
                type="button"
                onClick={() => {
                  const extractText = (node: Record<string, unknown>): string => {
                    if (node.type === "text") return (node.text as string) ?? "";
                    if (Array.isArray(node.content))
                      return (node.content as Record<string, unknown>[]).map(extractText).join(" ");
                    return "";
                  };
                  const text = extractText(section.richTextContent as Record<string, unknown>)
                    .trim().slice(0, 300);
                  if (text) onQuote(text, titleValue);
                }}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary border border-border hover:border-primary/30 px-3 py-2 rounded-xl transition-colors"
              >
                <Quote className="w-3.5 h-3.5" />
                Citar y comentar
              </button>
            )}

            {!isOwner && !isAuthenticated && (
              <p className="text-sm text-text-subtle">
                <a href="/login" className="text-primary hover:underline font-medium">Iniciá sesión</a>{" "}
                para forkear y editar este currículo.
              </p>
            )}

            {/* Save button — owner, not pdf embed, dirty or just saved */}
            {isOwner && !isPdfEmbed && (isDirty || saved) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className={cn(
                  "ml-auto flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl font-medium transition-colors",
                  saved
                    ? "bg-primary/10 text-primary cursor-default"
                    : saving
                    ? "bg-border-subtle text-text-muted cursor-wait"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                )}
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save    className="w-4 h-4" />
                }
                {saving ? "Guardando…" : saved ? "¡Guardado!" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
