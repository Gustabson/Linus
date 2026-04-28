import { prisma } from "./prisma";
import type { DocumentSection, VersionStatus } from "@prisma/client";

/**
 * Maps a DocumentSection to the data shape needed when creating a section
 * inside a new DocumentVersion. Used wherever sections are copied across versions.
 */
export function copySectionFields(s: DocumentSection) {
  return {
    sectionType:     s.sectionType,
    sectionOrder:    s.sectionOrder,
    difficultyLevel: s.difficultyLevel,
    ageRangeMin:     s.ageRangeMin,
    ageRangeMax:     s.ageRangeMax,
    gradeLevel:      s.gradeLevel,
    durationMinutes: s.durationMinutes,
    isComplete:      s.isComplete,
    richTextContent: s.richTextContent as object,
  };
}

/**
 * Ensures a DRAFT DocumentVersion exists for the given document.
 *
 * - No version at all → creates a fresh empty DRAFT.
 * - Latest is already DRAFT → returns it as-is.
 * - Latest is PUBLISHED → forks it into a new DRAFT, copying all sections.
 *
 * Used by the import route and any other route that appends content to a
 * document without going through the interactive section editor.
 */
export async function ensureDraft(docId: string, authorId: string) {
  const latest = await prisma.documentVersion.findFirst({
    where:   { documentId: docId },
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { sectionOrder: "asc" } } },
  });

  // ── No version yet ───────────────────────────────────────────────────────
  if (!latest) {
    const draft = await prisma.documentVersion.create({
      data:    { documentId: docId, authorId, status: "DRAFT" as VersionStatus },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await prisma.document.update({ where: { id: docId }, data: { currentVersionId: draft.id } });
    return draft;
  }

  // ── Already a DRAFT ──────────────────────────────────────────────────────
  if (latest.status === "DRAFT") return latest;

  // ── PUBLISHED → fork to a new DRAFT ─────────────────────────────────────
  const draft = await prisma.$transaction(async (tx) => {
    const newDraft = await tx.documentVersion.create({
      data: {
        documentId:      docId,
        authorId,
        status:          "DRAFT" as VersionStatus,
        parentVersionId: latest.id,
        sections: {
          create: latest.sections.map((s) => copySectionFields(s)),
        },
      },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await tx.document.update({ where: { id: docId }, data: { currentVersionId: newDraft.id } });
    return newDraft;
  });

  return draft;
}
