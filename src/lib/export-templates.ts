/**
 * Document export utilities: TipTap JSON → HTML, and HTML wrappers for
 * print and Word (.doc) export.
 *
 * Kept separate from DocExportButton so the templates can be unit-tested
 * and reused without importing React.
 */

import { generateHTML } from "@tiptap/core";
import StarterKit          from "@tiptap/starter-kit";
import Underline           from "@tiptap/extension-underline";
import Highlight           from "@tiptap/extension-highlight";
import TextAlign           from "@tiptap/extension-text-align";
import TiptapLink          from "@tiptap/extension-link";

// Same extensions as RichEditor (without Placeholder / CharacterCount)
const EXPORT_EXTENSIONS = [
  StarterKit,
  Underline,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TiptapLink.configure({ openOnClick: false }),
];

export interface ExportSection {
  id:              string;
  sectionType:     string;
  richTextContent: unknown;
}

// ── Content type guards ───────────────────────────────────────────────────────

export function isPdfEmbed(content: unknown): boolean {
  return (
    !!content &&
    typeof content === "object" &&
    (content as Record<string, unknown>).__type === "pdf_embed"
  );
}

export function isTipTapDoc(content: unknown): boolean {
  return (
    !!content &&
    typeof content === "object" &&
    (content as Record<string, unknown>).type === "doc"
  );
}

export function isExportable(s: ExportSection): boolean {
  return !isPdfEmbed(s.richTextContent) && isTipTapDoc(s.richTextContent);
}

// ── HTML generation ───────────────────────────────────────────────────────────

export function sectionToHTML(s: ExportSection): string {
  if (!isTipTapDoc(s.richTextContent)) return "";
  try {
    return generateHTML(
      s.richTextContent as Parameters<typeof generateHTML>[0],
      EXPORT_EXTENSIONS,
    );
  } catch {
    return "";
  }
}

export function buildBodyHTML(sections: ExportSection[]): string {
  return sections
    .map((s) => {
      const body = sectionToHTML(s);
      if (!body) return "";
      return `<h2 class="section-title">${s.sectionType}</h2><div class="section-body">${body}</div>`;
    })
    .filter(Boolean)
    .join('<hr class="section-sep" />');
}

// ── Shared typography (used by both print and Word) ───────────────────────────

const SHARED_CSS = `
    .section-title   { font-size: 1.4rem; font-weight: 700; text-align: center; margin: 2.5rem 0 1rem; color: #111; }
    .section-body h1 { font-size: 1.875rem; font-weight: 700; margin: 0.75em 0 0.4em; }
    .section-body h2 { font-size: 1.5rem;   font-weight: 600; margin: 0.75em 0 0.4em; }
    .section-body h3 { font-size: 1.25rem;  font-weight: 600; margin: 0.75em 0 0.4em; }
    p             { margin: 0 0 0.75rem; }
    ul            { list-style: disc;    padding-left: 1.6rem; margin-bottom: 0.75rem; }
    ol            { list-style: decimal; padding-left: 1.6rem; margin-bottom: 0.75rem; }
    li            { margin-bottom: 0.2em; }
    blockquote    { border-left: 4px solid #6366f1; padding-left: 1rem; color: #555; margin: 1rem 0; font-style: italic; }
    code          { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 3px; font-family: "Courier New", monospace; font-size: 0.9em; }
    pre           { background: #1e1e1e; color: #e5e5e5; padding: 1rem 1.25rem; border-radius: 8px; overflow: auto; font-size: 0.875em; }
    pre code      { background: none; padding: 0; color: inherit; }
    strong        { font-weight: 700; }
    em            { font-style: italic; }
    u             { text-decoration: underline; }
    s             { text-decoration: line-through; }
    mark          { background-color: #fef08a; padding: 0.05em 0.1em; }
    a             { color: #6366f1; text-decoration: underline; }
    .section-sep  { border: none; border-top: 1px solid #d1d5db; margin: 2rem 0; }
`;

// ── Print wrapper ─────────────────────────────────────────────────────────────
//
// Two-layer margin strategy for cross-browser/OS reliability:
//   @page  → native print margins, applies to every page in print
//            (Chrome, Edge, Firefox desktop — all support this).
//   body   → visual margins in the browser popup preview (where @page
//            doesn't apply) AND fallback for any print engine that ignores @page.
//   @media print removes body margin so both layers don't stack.

export function wrapForPrint(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page        { margin: 2.54cm; }
    body         { font-family: Georgia, "Times New Roman", serif; margin: 2.54cm; padding: 0; color: #1a1a1a; line-height: 1.65; font-size: 16px; }
    @media print { body { margin: 0; } }
    h1.doc-title { font-size: 2.4rem; font-weight: 700; text-align: center; margin: 0 0 0.4em; border-bottom: 2px solid #d1d5db; padding-bottom: 0.4em; }
    ${SHARED_CSS}
  </style>
</head>
<body>
  <h1 class="doc-title">${title}</h1>
  ${body}
</body>
</html>`;
}

// ── Word wrapper ──────────────────────────────────────────────────────────────
//
// Uses <p> (not <h1>) for the document title so Word/LibreOffice does NOT
// place it in the repeating page header — it appears once at the top of
// the body. mso-header-margin/footer-margin: 0 prevents any header area.

export function wrapForWord(title: string, body: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"/>
  <meta name=ProgId content=Word.Document>
  <title>${title}</title>
  <style>
    @page {
      margin: 2.54cm;
      mso-header-margin: 0;
      mso-footer-margin: 0;
    }
    body    { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; color: #1a1a1a; line-height: 1.5; }
    p.doc-title { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 6pt; border-bottom: 1pt solid #d1d5db; padding-bottom: 4pt; }
    .section-title   { font-size: 14pt; font-weight: 700; text-align: center; margin: 18pt 0 8pt; }
    .section-body h1 { font-size: 16pt; font-weight: 700; margin: 12pt 0 4pt; }
    .section-body h2 { font-size: 14pt; font-weight: 600; margin: 10pt 0 4pt; }
    .section-body h3 { font-size: 12pt; font-weight: 600; margin: 8pt 0 4pt; }
    p             { margin: 0 0 6pt; }
    ul            { list-style: disc;    padding-left: 1.5cm; margin-bottom: 6pt; }
    ol            { list-style: decimal; padding-left: 1.5cm; margin-bottom: 6pt; }
    li            { margin-bottom: 2pt; }
    blockquote    { border-left: 3pt solid #6366f1; padding-left: 12pt; color: #555; margin: 8pt 0; font-style: italic; }
    code          { background: #f3f4f6; font-family: "Courier New", monospace; font-size: 10pt; }
    strong        { font-weight: 700; }
    em            { font-style: italic; }
    u             { text-decoration: underline; }
    s             { text-decoration: line-through; }
    mark          { background-color: #fef08a; }
    .section-sep  { border-top: 1pt solid #d1d5db; margin: 12pt 0; }
  </style>
</head>
<body>
  <p class="doc-title">${title}</p>
  ${body}
</body>
</html>`;
}
