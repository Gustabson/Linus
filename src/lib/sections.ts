import type { DocumentSection } from "@prisma/client";

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
