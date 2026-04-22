"use client";

import { useState } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { DocumentComments } from "@/components/documents/DocumentComments";

interface Props {
  treeSlug: string;
  docSlug: string;
  docId: string;
  versionId: string | null;
  sectionsMap: Record<string, unknown>;
  isOwner: boolean;
  isAuthenticated: boolean;
  currentUserId?: string;
}

export function DocumentCommentsWrapper({
  treeSlug,
  docSlug,
  docId,
  versionId,
  sectionsMap,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sectionsMap={sectionsMap as any}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        onQuote={isAuthenticated ? (text, sectionType) => {
          setPendingQuote({ text, sectionType });
          // Scroll to comments
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
