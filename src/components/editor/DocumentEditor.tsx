"use client";

import { useState } from "react";
import { SECTION_ORDER } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
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
  sectionsMap,
  isOwner,
  isAuthenticated,
}: DocumentEditorProps) {
  const [openSection, setOpenSection] = useState<string>(SECTION_ORDER[0]);

  async function saveSection(
    sectionType: string,
    richTextContent: object,
    meta: Record<string, string | number | null>
  ) {
    await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionType, richTextContent, ...meta }),
    });
  }

  return (
    <div className="space-y-3">
      {SECTION_ORDER.map((sectionType, idx) => (
        <SectionCard
          key={sectionType}
          sectionType={sectionType}
          index={idx}
          section={sectionsMap[sectionType]}
          isOpen={openSection === sectionType}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          onToggle={() => setOpenSection(openSection === sectionType ? "" : sectionType)}
          onSave={saveSection}
        />
      ))}
    </div>
  );
}
