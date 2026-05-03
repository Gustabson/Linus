"use client";

import { useState } from "react";
import { Printer, FileDown, ChevronDown, X, Loader2 } from "lucide-react";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";

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

interface Props {
  title:    string;
  sections: ExportSection[];   // initial sections (may be stale — fresh fetch on export)
  treeSlug: string;
  docSlug:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPdfEmbed(content: unknown): boolean {
  return (
    !!content &&
    typeof content === "object" &&
    (content as Record<string, unknown>).__type === "pdf_embed"
  );
}

function isTipTapDoc(content: unknown): boolean {
  return (
    !!content &&
    typeof content === "object" &&
    (content as Record<string, unknown>).type === "doc"
  );
}

function isExportable(s: ExportSection): boolean {
  return !isPdfEmbed(s.richTextContent) && isTipTapDoc(s.richTextContent);
}

function sectionToHTML(s: ExportSection): string {
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

function buildBodyHTML(sections: ExportSection[]): string {
  return sections
    .map((s) => {
      const body = sectionToHTML(s);
      if (!body) return "";
      return `<h2 class="section-title">${s.sectionType}</h2><div class="section-body">${body}</div>`;
    })
    .filter(Boolean)
    .join('<hr class="section-sep" />');
}

// Shared typography styles used in both print and Word
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

/**
 * Print version — body padding drives all margins (no @page conflicts).
 * Title stays in the document body.
 */
function wrapForPrint(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    /* @page handles top + bottom for EVERY page (including page 2, 3…).
       Left/right are 0 so body padding owns the side margins.        */
    @page   { margin: 2.54cm 0; }
    /* Body padding = side margins (works in browser popup AND print).
       Small top padding only for the browser preview window.         */
    body    { font-family: Georgia, "Times New Roman", serif; margin: 0; padding: 0.6cm 2.54cm 0; color: #1a1a1a; line-height: 1.65; font-size: 16px; }
    @media print { body { padding-top: 0; } }
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

/**
 * Word version — uses @page with mso margins so Word/LibreOffice
 * places the document title in the page header (running header),
 * which is the desired behaviour.
 */
function wrapForWord(title: string, body: string): string {
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
      mso-header-margin: 1.25cm;
      mso-footer-margin: 1.25cm;
    }
    body    { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; color: #1a1a1a; line-height: 1.5; }
    h1.doc-title { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 6pt; border-bottom: 1pt solid #d1d5db; padding-bottom: 4pt; }
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
  <h1 class="doc-title">${title}</h1>
  ${body}
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocExportButton({ title, sections: initialSections, treeSlug, docSlug }: Props) {
  const [open,             setOpen]             = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [showModal,        setShowModal]        = useState(false);
  const [action,           setAction]           = useState<"print" | "word" | null>(null);
  const [exportableSects,  setExportableSects]  = useState<ExportSection[]>(
    () => initialSections.filter(isExportable),
  );
  const [selected,         setSelected]         = useState<Set<string>>(
    () => new Set(initialSections.filter(isExportable).map((s) => s.id)),
  );

  // ── Fetch fresh sections from the server ──────────────────────────────────

  async function fetchFreshSections(): Promise<ExportSection[]> {
    try {
      const res = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`);
      if (!res.ok) return initialSections;
      const data = await res.json();
      return (data.sections ?? []) as ExportSection[];
    } catch {
      return initialSections;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function doPrint(sects: ExportSection[]) {
    const html = wrapForPrint(title, buildBodyHTML(sects));
    const win  = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
  }

  function doWord(sects: ExportSection[]) {
    const html = wrapForWord(title, buildBodyHTML(sects));
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${title.replace(/[^a-z0-9áéíóúüñ\s]/gi, "").trim().replace(/\s+/g, "_")}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function triggerAction(act: "print" | "word") {
    setOpen(false);
    setLoading(true);

    const fresh     = await fetchFreshSections();
    const freshExp  = fresh.filter(isExportable);

    setLoading(false);

    if (freshExp.length === 0) return;

    if (freshExp.length === 1) {
      act === "print" ? doPrint(freshExp) : doWord(freshExp);
    } else {
      setExportableSects(freshExp);
      setSelected(new Set(freshExp.map((s) => s.id)));
      setAction(act);
      setShowModal(true);
    }
  }

  function confirmModal() {
    const sects = exportableSects.filter((s) => selected.has(s.id));
    if (sects.length === 0) return;
    action === "print" ? doPrint(sects) : doWord(sects);
    setShowModal(false);
    setAction(null);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(exportableSects.map((s) => s.id)) : new Set());
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Dropdown trigger ── */}
      <div className="relative">
        <button
          onClick={() => !loading && setOpen((v) => !v)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-text-muted border border-border px-3 py-2 rounded-xl hover:bg-bg hover:border-gray-300 disabled:opacity-60 transition-colors"
        >
          {loading
            ? <Loader2    className="w-4 h-4 animate-spin" />
            : <FileDown   className="w-4 h-4" />
          }
          <span className="hidden sm:inline">{loading ? "Cargando…" : "Exportar"}</span>
          {!loading && <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-40 bg-surface border border-border rounded-xl shadow-lg w-44 overflow-hidden">
              <button
                onClick={() => triggerAction("print")}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg transition-colors"
              >
                <Printer  className="w-4 h-4 shrink-0" />
                Imprimir
              </button>
              <button
                onClick={() => triggerAction("word")}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg transition-colors"
              >
                <FileDown className="w-4 h-4 shrink-0" />
                Descargar Word
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Section-selection modal (multi-section docs) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">

            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-text text-lg leading-tight">
                {action === "print" ? "Imprimir secciones" : "Exportar a Word"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted">Elegí qué secciones incluir:</p>

            {/* Select-all */}
            <label className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-xl hover:bg-bg border-b border-border-subtle pb-3">
              <input
                type="checkbox"
                checked={selected.size === exportableSects.length}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm font-medium text-text">Todas</span>
            </label>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {exportableSects.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer px-2 py-2 rounded-xl hover:bg-bg">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(s.id); else next.delete(s.id);
                      setSelected(next);
                    }}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm text-text line-clamp-1">{s.sectionType}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="text-sm text-text-muted px-4 py-2.5 rounded-xl hover:bg-bg transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirmModal}
                disabled={selected.size === 0}
                className="flex items-center gap-2 text-sm font-medium bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {action === "print"
                  ? <><Printer  className="w-4 h-4" /> Imprimir</>
                  : <><FileDown className="w-4 h-4" /> Descargar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
