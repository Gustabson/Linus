"use client";

import { useState } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { DocumentComments } from "@/components/documents/DocumentComments";
import type { DocumentSection } from "@prisma/client";

interface Props {
  treeSlug:        string;
  docSlug:         string;
  docId:           string;
  versionId:       string | null;
  sections:        DocumentSection[];
  isOwner:         boolean;
  isAuthenticated: boolean;
  currentUserId?:  string;
}

export function DocumentCommentsWrapper({
  treeSlug,
  docSlug,
  docId,
  versionId,
  sections,
  isOwner,
  isAuthenticated,
  currentUserId,
}: Props) {
  const [pendingQuote, setPendingQuote] = useState<{
    text: string;
    sectionType: string;
  } | null>(null);

  return (
    <>
      <DocumentEditor
        treeSlug={treeSlug}
        docSlug={docSlug}
        versionId={versionId}
        sections={sections}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        onQuote={isAuthenticated ? (text, sectionTitle) => {
          setPendingQuote({ text, sectionType: sectionTitle });
          setTimeout(() => {
            document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        } : undefined}
      />

      <div id="comments-section">
        <DocumentComments
          docId={docId}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          prefilledQuote={pendingQuote}
          onQuoteUsed={() => setPendingQuote(null)}
        />
      </div>
    </>
  );
}
