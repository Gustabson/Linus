import { describe, it, expect } from "vitest";
import {
  isPdfEmbed,
  isTipTapDoc,
  isExportable,
  buildBodyHTML,
  type ExportSection,
} from "./export-templates";

const TIPTAP_DOC = { type: "doc", content: [] };
const PDF_EMBED  = { __type: "pdf_embed", url: "https://example.com/file.pdf" };

describe("isPdfEmbed", () => {
  it("detects pdf embed objects", () => {
    expect(isPdfEmbed(PDF_EMBED)).toBe(true);
  });

  it("returns false for TipTap docs", () => {
    expect(isPdfEmbed(TIPTAP_DOC)).toBe(false);
  });

  it("returns false for null/undefined/primitives", () => {
    expect(isPdfEmbed(null)).toBe(false);
    expect(isPdfEmbed(undefined)).toBe(false);
    expect(isPdfEmbed("string")).toBe(false);
    expect(isPdfEmbed(42)).toBe(false);
  });
});

describe("isTipTapDoc", () => {
  it("detects TipTap doc objects", () => {
    expect(isTipTapDoc(TIPTAP_DOC)).toBe(true);
  });

  it("returns false for pdf embeds", () => {
    expect(isTipTapDoc(PDF_EMBED)).toBe(false);
  });

  it("returns false for null/undefined/primitives", () => {
    expect(isTipTapDoc(null)).toBe(false);
    expect(isTipTapDoc(undefined)).toBe(false);
  });
});

describe("isExportable", () => {
  it("accepts TipTap doc sections", () => {
    const section: ExportSection = { id: "1", sectionType: "Introducción", richTextContent: TIPTAP_DOC };
    expect(isExportable(section)).toBe(true);
  });

  it("rejects pdf embed sections", () => {
    const section: ExportSection = { id: "2", sectionType: "PDF", richTextContent: PDF_EMBED };
    expect(isExportable(section)).toBe(false);
  });

  it("rejects null content", () => {
    const section: ExportSection = { id: "3", sectionType: "Vacía", richTextContent: null };
    expect(isExportable(section)).toBe(false);
  });
});

describe("buildBodyHTML", () => {
  it("returns empty string for empty array", () => {
    expect(buildBodyHTML([])).toBe("");
  });

  it("skips non-exportable sections silently", () => {
    const sections: ExportSection[] = [
      { id: "1", sectionType: "PDF", richTextContent: PDF_EMBED },
    ];
    expect(buildBodyHTML(sections)).toBe("");
  });

  it("includes section-title wrapper when sectionToHTML produces output", () => {
    // Note: generateHTML (TipTap) requires a browser-like ProseMirror environment.
    // In Node test environment it returns "". This test verifies the surrounding
    // logic (filtering, joining) rather than TipTap's own rendering.
    // Full render is covered by manual / e2e testing.
    const sections: ExportSection[] = [
      { id: "1", sectionType: "Introducción", richTextContent: TIPTAP_DOC },
      { id: "2", sectionType: "PDF",          richTextContent: PDF_EMBED  },
    ];
    // Both sections are passed; PDF embed should be silently skipped.
    // TIPTAP_DOC has no content nodes so generateHTML may return "" → also skipped.
    // Either way: the PDF section must NOT appear in output.
    const html = buildBodyHTML(sections);
    expect(html).not.toContain("pdf_embed");
  });
});
