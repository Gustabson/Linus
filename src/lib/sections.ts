import { prisma } from "./prisma";
import type { DocumentSection, VersionStatus } from "@prisma/client";

export const SECTION_TITLE_MAX = 200;
export const MAX_RICH_TEXT_BYTES = 1_000_000;

const NODE_TYPES = new Set([
  "doc", "paragraph", "text", "heading", "bulletList", "orderedList",
  "listItem", "blockquote", "codeBlock", "horizontalRule", "hardBreak",
]);
const MARK_TYPES = new Set(["bold", "italic", "underline", "strike", "code", "highlight", "link"]);
const TEXT_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" || url.protocol === "tel:";
  } catch {
    return false;
  }
}

function sanitizeMarks(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const marks: Record<string, unknown>[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.type !== "string" || !MARK_TYPES.has(candidate.type)) continue;
    if (candidate.type === "link") {
      const href = isRecord(candidate.attrs) ? candidate.attrs.href : null;
      if (!isSafeLink(href)) continue;
      marks.push({ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } });
      continue;
    }
    if (candidate.type === "highlight") {
      const color = isRecord(candidate.attrs) ? candidate.attrs.color : null;
      if (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color))
        marks.push({ type: "highlight", attrs: { color } });
      continue;
    }
    marks.push({ type: candidate.type });
  }
  return marks.length ? marks : undefined;
}

function sanitizeNode(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || typeof value.type !== "string" || !NODE_TYPES.has(value.type)) return null;
  const node: Record<string, unknown> = { type: value.type };

  if (value.type === "text") {
    if (typeof value.text !== "string") return null;
    node.text = value.text;
    const marks = sanitizeMarks(value.marks);
    if (marks) node.marks = marks;
    return node;
  }

  if (value.type === "heading") {
    const level = isRecord(value.attrs) ? value.attrs.level : null;
    const attrs: Record<string, unknown> = { level: level === 1 || level === 2 || level === 3 ? level : 2 };
    const textAlign = isRecord(value.attrs) ? value.attrs.textAlign : null;
    if (typeof textAlign === "string" && TEXT_ALIGNMENTS.has(textAlign)) attrs.textAlign = textAlign;
    node.attrs = attrs;
  } else if (value.type === "paragraph" && isRecord(value.attrs)) {
    const textAlign = value.attrs.textAlign;
    if (typeof textAlign === "string" && TEXT_ALIGNMENTS.has(textAlign)) node.attrs = { textAlign };
  } else if (value.type === "codeBlock" && isRecord(value.attrs)) {
    const language = value.attrs.language;
    if (typeof language === "string" && /^[a-z0-9_+#.-]{1,40}$/i.test(language)) node.attrs = { language };
  }

  if (Array.isArray(value.content)) {
    const content = value.content.map(sanitizeNode).filter((item): item is Record<string, unknown> => item !== null);
    if (content.length) node.content = content;
  }
  return node;
}

/** Validates and strips unsafe/unknown TipTap nodes, marks and attributes. */
export function sanitizeRichTextDocument(value: unknown): object | null {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_RICH_TEXT_BYTES) return null;
  const sanitized = sanitizeNode(value);
  return sanitized?.type === "doc" ? sanitized : null;
}

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

type SectionCopy = ReturnType<typeof copySectionFields>;
type PublishedVersion = { id: string; sections: DocumentSection[] };

class DraftCreationConflict extends Error {}

function mapSectionIds(source: DocumentSection[], target: DocumentSection[]) {
  const map: Record<string, string> = {};
  for (const oldSection of source) {
    const fresh = target.find((section) => section.sectionOrder === oldSection.sectionOrder);
    if (fresh) map[oldSection.id] = fresh.id;
  }
  return map;
}

/** Atomically forks a published version, reusing a draft created concurrently by another request. */
export async function forkPublishedVersionToDraft(
  docId: string,
  authorId: string,
  published: PublishedVersion,
  overrides: Record<string, Partial<SectionCopy>> = {},
) {
  try {
    const draft = await prisma.$transaction(async (tx) => {
      const newDraft = await tx.documentVersion.create({
        data: {
          documentId: docId,
          authorId,
          status: "DRAFT" as VersionStatus,
          parentVersionId: published.id,
          sections: {
            create: published.sections.map((section) => ({
              ...copySectionFields(section),
              ...(overrides[section.id] ?? {}),
            })),
          },
        },
        include: { sections: { orderBy: { sectionOrder: "asc" } } },
      });
      const claimed = await tx.document.updateMany({
        where: {
          id: docId,
          OR: [{ currentVersionId: published.id }, { currentVersionId: null }],
        },
        data: { currentVersionId: newDraft.id },
      });
      if (claimed.count !== 1) throw new DraftCreationConflict();
      return newDraft;
    });
    return { draft, sectionIdMap: mapSectionIds(published.sections, draft.sections) };
  } catch (error) {
    if (!(error instanceof DraftCreationConflict)) throw error;
    const draft = await prisma.documentVersion.findFirst({
      where: { documentId: docId, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    if (!draft) throw error;
    const sectionIdMap = mapSectionIds(published.sections, draft.sections);
    const updates = Object.entries(overrides).flatMap(([oldId, data]) => {
      const id = sectionIdMap[oldId];
      return id ? [prisma.documentSection.update({ where: { id }, data })] : [];
    });
    if (updates.length) await prisma.$transaction(updates);
    return { draft, sectionIdMap };
  }
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
  return (await forkPublishedVersionToDraft(docId, authorId, latest)).draft;
}
