"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Circle, Save } from "lucide-react";
import { SECTION_LABELS, SECTION_DESCRIPTIONS, cn } from "@/lib/utils";
import { SectionEditor } from "./SectionEditor";
import { SectionMetaFields } from "./SectionMetaFields";
import type { DocumentSection } from "@prisma/client";

interface SectionCardProps {
  sectionType: string;
  index: number;
  section: DocumentSection | null;
  isOpen: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  onToggle: () => void;
  onSave: (sectionType: string, content: object, meta: Record<string, string | number | null>) => Promise<void>;
}

export function SectionCard({
  sectionType,
  index,
  section,
  isOpen,
  isOwner,
  isAuthenticated,
  onToggle,
  onSave,
}: SectionCardProps) {
  const [content, setContent] = useState<object | null>(null);
  const [meta, setMeta] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = content !== null;

  function handleMetaChange(field: string, value: string | number | null) {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    await onSave(sectionType, content, meta);
    setSaving(false);
    setSaved(true);
    setContent(null);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border transition-all",
      isOpen ? "border-green-300 shadow-sm" : "border-gray-200"
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {SECTION_LABELS[sectionType]}
              </span>
              {section?.isComplete
                ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <Circle className="w-4 h-4 text-gray-300" />}
              {isDirty && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Sin guardar
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {SECTION_DESCRIPTIONS[sectionType]}
            </p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4">
          {isOwner && (
            <SectionMetaFields
              difficultyLevel={section?.difficultyLevel}
              ageRangeMin={section?.ageRangeMin}
              ageRangeMax={section?.ageRangeMax}
              durationMinutes={section?.durationMinutes}
              onChange={handleMetaChange}
            />
          )}

          <SectionEditor
            content={section?.richTextContent as object ?? null}
            placeholder={`Escribí el contenido de "${SECTION_LABELS[sectionType]}"...`}
            editable={isOwner}
            onChange={setContent}
          />

          {isOwner && isDirty && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar"}
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
