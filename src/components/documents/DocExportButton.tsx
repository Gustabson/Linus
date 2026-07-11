"use client";

import { useState } from "react";
import { Printer, FileDown, ChevronDown, X, Loader2 } from "lucide-react";
import {
  type ExportSection,
  isExportable,
  buildBodyHTML,
  wrapForPrint,
} from "@/lib/export-templates";
import { exportToDocx } from "@/lib/docx-export";

export type { ExportSection };

interface Props {
  title:    string;
  sections: ExportSection[];   // initial sections (may be stale — fresh fetch on export)
  treeSlug: string;
  docSlug:  string;
  workspace?: boolean;
}

export function DocExportButton({ title, sections: initialSections, treeSlug, docSlug, workspace = false }: Props) {
  const [open,            setOpen]            = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [showModal,       setShowModal]       = useState(false);
  const [action,          setAction]          = useState<"print" | "word" | null>(null);
  const [exportableSects, setExportableSects] = useState<ExportSection[]>(
    () => initialSections.filter(isExportable),
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSections.filter(isExportable).map((s) => s.id)),
  );

  // ── Fetch fresh sections before export ────────────────────────────────────

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

  // ── Export actions ────────────────────────────────────────────────────────

  function doPrint(sects: ExportSection[]) {
    const html = wrapForPrint(title, buildBodyHTML(sects));
    const win  = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
  }

  async function doWord(sects: ExportSection[]) {
    await exportToDocx(
      sects.map(s => ({ title: s.sectionType, content: s.richTextContent as object | null })),
      title,
    );
  }

  async function triggerAction(act: "print" | "word") {
    setOpen(false);
    setLoading(true);

    const fresh    = await fetchFreshSections();
    const freshExp = fresh.filter(isExportable);

    setLoading(false);
    if (freshExp.length === 0) return;

    if (freshExp.length === 1) {
      if (act === "print") doPrint(freshExp); else await doWord(freshExp);
    } else {
      setExportableSects(freshExp);
      setSelected(new Set(freshExp.map((s) => s.id)));
      setAction(act);
      setShowModal(true);
    }
  }

  async function confirmModal() {
    const sects = exportableSects.filter((s) => selected.has(s.id));
    if (sects.length === 0) return;
    if (action === "print") doPrint(sects); else await doWord(sects);
    setShowModal(false);
    setAction(null);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(exportableSects.map((s) => s.id)) : new Set());
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => !loading && setOpen((v) => !v)}
          disabled={loading}
          className={workspace
            ? "flex h-[34px] items-center gap-1.5 rounded-md border border-[#d8dfd9] bg-white px-3 text-[13px] font-semibold text-[#3b483f] transition-colors hover:bg-[#f5f7f5] disabled:opacity-60"
            : "flex items-center gap-1.5 text-sm text-text-muted border border-border px-3 py-2 rounded-xl hover:bg-bg hover:border-gray-300 disabled:opacity-60 transition-colors"
          }
        >
          {loading
            ? <Loader2  className="w-4 h-4 animate-spin" />
            : <FileDown className="w-4 h-4" />
          }
          <span className="hidden sm:inline">{loading ? "Cargando…" : "Exportar"}</span>
          {!loading && !workspace && <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
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

      {/* Section-selection modal (multi-section docs) */}
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
