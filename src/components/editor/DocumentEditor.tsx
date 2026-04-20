"use client";

import { useState } from "react";
import { SECTION_LABELS, SECTION_DESCRIPTIONS, SECTION_ORDER, cn } from "@/lib/utils";
import { SectionEditor } from "./SectionEditor";
import { ChevronDown, ChevronUp, CheckCircle, Circle, Save } from "lucide-react";
import type { DocumentSection } from "@prisma/client";

interface DocumentEditorProps {
  treeSlug: string;
  docSlug: string;
  versionId: string | null;
  sectionsMap: Record<string, DocumentSection | null>;
  isOwner: boolean;
  isAuthenticated: boolean;
}

export function DocumentEditor({
  treeSlug,
  docSlug,
  versionId,
  sectionsMap,
  isOwner,
  isAuthenticated,
}: DocumentEditorProps) {
  const [openSection, setOpenSection] = useState<string>(SECTION_ORDER[0]);
  const [edits, setEdits] = useState<Record<string, object>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveSection(sectionType: string) {
    if (!edits[sectionType]) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionType, richTextContent: edits[sectionType] }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {SECTION_ORDER.map((sectionType, idx) => {
        const section = sectionsMap[sectionType];
        const isOpen = openSection === sectionType;
        const isDirty = !!edits[sectionType];

        return (
          <div
            key={sectionType}
            className={cn(
              "bg-white rounded-2xl border transition-all",
              isOpen ? "border-green-300 shadow-sm" : "border-gray-200"
            )}
          >
            {/* Section header */}
            <button
              type="button"
              onClick={() => setOpenSection(isOpen ? "" : sectionType)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {SECTION_LABELS[sectionType]}
                    </span>
                    {section?.isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300" />
                    )}
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
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
              )}
            </button>

            {/* Section content */}
            {isOpen && (
              <div className="px-5 pb-5 space-y-4">
                {/* Metadata fields */}
                {isOwner && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Nivel</label>
                      <select
                        defaultValue={section?.difficultyLevel ?? "BEGINNER"}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        {["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((l) => (
                          <option key={l} value={l}>
                            {l === "BEGINNER" ? "Principiante" : l === "INTERMEDIATE" ? "Intermedio" : l === "ADVANCED" ? "Avanzado" : "Experto"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Edad min.</label>
                      <input
                        type="number"
                        defaultValue={section?.ageRangeMin ?? ""}
                        placeholder="5"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Edad max.</label>
                      <input
                        type="number"
                        defaultValue={section?.ageRangeMax ?? ""}
                        placeholder="18"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duración (min)</label>
                      <input
                        type="number"
                        defaultValue={section?.durationMinutes ?? ""}
                        placeholder="45"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                  </div>
                )}

                {/* Rich text editor */}
                <SectionEditor
                  content={section?.richTextContent as object ?? null}
                  placeholder={`Escribí el contenido de "${SECTION_LABELS[sectionType]}"...`}
                  editable={isOwner}
                  onChange={(json) => setEdits((prev) => ({ ...prev, [sectionType]: json }))}
                />

                {/* Save button */}
                {isOwner && isDirty && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveSection(sectionType)}
                      disabled={saving}
                      className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
                    </button>
                  </div>
                )}

                {!isOwner && !isAuthenticated && (
                  <p className="text-center text-sm text-gray-400 py-2">
                    <a href="/login" className="text-green-700 hover:underline">
                      Iniciá sesión
                    </a>{" "}
                    para forkear y editar este currículo.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
