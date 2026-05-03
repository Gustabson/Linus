"use client";

import { useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, Quote, Code, CodeXml,
  Minus, Link as LinkIcon, Undo, Redo, Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecdd3", "#fed7aa"];

interface SectionEditorProps {
  content: object | null;
  placeholder?: string;
  onChange?: (json: object) => void;
  editable?: boolean;
}

export function SectionEditor({
  content,
  placeholder = "Empezá a escribir aquí...",
  onChange,
  editable = true,
}: SectionEditorProps) {
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [linkModalOpen,       setLinkModalOpen]       = useState(false);
  const [linkUrl,             setLinkUrl]             = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: content ?? "",
    editable,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  const is = useEditorState({
    editor,
    selector: (ctx) => ({
      bold:        ctx.editor?.isActive("bold")                  ?? false,
      italic:      ctx.editor?.isActive("italic")                ?? false,
      underline:   ctx.editor?.isActive("underline")             ?? false,
      strike:      ctx.editor?.isActive("strike")                ?? false,
      highlight:   ctx.editor?.isActive("highlight")             ?? false,
      paragraph:   ctx.editor?.isActive("paragraph")             ?? false,
      h1:          ctx.editor?.isActive("heading", { level: 1 }) ?? false,
      h2:          ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      h3:          ctx.editor?.isActive("heading", { level: 3 }) ?? false,
      bulletList:  ctx.editor?.isActive("bulletList")            ?? false,
      orderedList: ctx.editor?.isActive("orderedList")           ?? false,
      blockquote:  ctx.editor?.isActive("blockquote")            ?? false,
      code:        ctx.editor?.isActive("code")                  ?? false,
      codeBlock:   ctx.editor?.isActive("codeBlock")             ?? false,
      link:        ctx.editor?.isActive("link")                  ?? false,
      alignLeft:   ctx.editor?.isActive({ textAlign: "left"   }) ?? false,
      alignCenter: ctx.editor?.isActive({ textAlign: "center" }) ?? false,
    }),
  });

  if (!editor) return null;

  function openLinkModal() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    setLinkUrl(prev ?? "");
    setLinkModalOpen(true);
  }

  function applyLink() {
    const raw = linkUrl.trim();
    if (!raw) {
      editor!.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      editor!.chain().focus().setLink({ href }).run();
    }
    setLinkModalOpen(false);
  }

  function btn(active: boolean, onClick: () => void, label: string, icon: React.ReactNode) {
    return (
      <button
        type="button"
        title={label}
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-subtle hover:text-text"
        )}
      >
        {icon}
      </button>
    );
  }

  const sep = <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

  return (
    <div className="border border-border rounded-xl bg-surface">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border-subtle bg-bg rounded-t-xl">
          {btn(is.bold,      () => editor.chain().focus().toggleBold().run(),      "Negrita",        <Bold           className="w-4 h-4" />)}
          {btn(is.italic,    () => editor.chain().focus().toggleItalic().run(),    "Cursiva",        <Italic         className="w-4 h-4" />)}
          {btn(is.underline, () => editor.chain().focus().toggleUnderline().run(), "Subrayado",      <UnderlineIcon  className="w-4 h-4" />)}
          {btn(is.strike,    () => editor.chain().focus().toggleStrike().run(),    "Tachado",        <Strikethrough  className="w-4 h-4" />)}

          {/* Highlight con colores inline */}
          <button
            type="button"
            title="Resaltado"
            onMouseDown={(e) => { e.preventDefault(); setShowHighlightColors(v => !v); }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              is.highlight || showHighlightColors
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-border-subtle hover:text-text"
            )}
          >
            <Highlighter className="w-4 h-4" />
          </button>
          {showHighlightColors && (
            <>
              {HIGHLIGHT_COLORS.map(color => (
                <button key={color} type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setHighlight({ color }).run(); setShowHighlightColors(false); }}
                  className="w-5 h-5 rounded border border-border/60 hover:scale-110 transition-transform shrink-0"
                  style={{ backgroundColor: color }} title="Aplicar color" />
              ))}
              <button type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlightColors(false); }}
                className="w-5 h-5 rounded border border-border flex items-center justify-center text-[10px] text-text-muted hover:text-text hover:bg-bg transition-colors shrink-0"
                title="Quitar resaltado">✕</button>
            </>
          )}

          {sep}

          {/* Párrafo y headings: P → H3 → H2 → H1 */}
          {btn(is.paragraph, () => editor.chain().focus().setParagraph().run(), "Párrafo normal",
            <span className="text-[11px] font-bold leading-none w-4 h-4 flex items-center justify-center">P</span>)}
          {btn(is.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Título pequeño (H3)", <Heading3 className="w-4 h-4" />)}
          {btn(is.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título mediano (H2)", <Heading2 className="w-4 h-4" />)}
          {btn(is.h1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Título grande (H1)",  <Heading1 className="w-4 h-4" />)}

          {sep}

          {btn(is.bulletList,  () => editor.chain().focus().toggleBulletList().run(),  "Lista",          <List         className="w-4 h-4" />)}
          {btn(is.orderedList, () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada", <ListOrdered  className="w-4 h-4" />)}
          {btn(is.blockquote,  () => editor.chain().focus().toggleBlockquote().run(),  "Cita",           <Quote        className="w-4 h-4" />)}

          {sep}

          {btn(is.code,      () => editor.chain().focus().toggleCode().run(),      "Código inline",  <Code    className="w-4 h-4" />)}
          {btn(is.codeBlock, () => editor.chain().focus().toggleCodeBlock().run(), "Bloque código",  <CodeXml className="w-4 h-4" />)}
          {btn(false, () => editor.chain().focus().setHorizontalRule().run(), "Separador", <Minus className="w-4 h-4" />)}

          {sep}

          {btn(is.alignLeft,   () => editor.chain().focus().setTextAlign("left").run(),   "Izquierda", <AlignLeft   className="w-4 h-4" />)}
          {btn(is.alignCenter, () => editor.chain().focus().setTextAlign("center").run(), "Centro",    <AlignCenter className="w-4 h-4" />)}

          {sep}

          {btn(is.link, openLinkModal, "Enlace", <LinkIcon className="w-4 h-4" />)}

          {sep}

          {btn(false, () => editor.chain().focus().undo().run(), "Deshacer", <Undo className="w-4 h-4" />)}
          {btn(false, () => editor.chain().focus().redo().run(), "Rehacer",  <Redo className="w-4 h-4" />)}

          <div className="ml-auto text-xs text-text-subtle shrink-0">
            {editor.storage.characterCount?.characters() ?? 0} caracteres
          </div>
        </div>
      )}
      <div className="p-4">
        <EditorContent editor={editor} className="tiptap" />
      </div>

      {/* ── Modal de enlace ─────────────────────────────────────────── */}
      {linkModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setLinkModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-surface rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm space-y-3 pointer-events-auto">
              <p className="text-sm font-semibold text-text">Insertar enlace</p>
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkModalOpen(false); }}
                placeholder="https://ejemplo.com"
                autoFocus
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-bg text-text placeholder:text-text-subtle"
              />
              <div className="flex items-center gap-2 justify-end">
                {is.link && (
                  <button type="button"
                    onClick={() => { editor.chain().focus().unsetLink().run(); setLinkModalOpen(false); }}
                    className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors mr-auto">
                    Quitar enlace
                  </button>
                )}
                <button type="button" onClick={() => setLinkModalOpen(false)}
                  className="text-sm text-text-muted border border-border px-3 py-1.5 rounded-xl hover:bg-bg transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={applyLink}
                  className="text-sm font-semibold bg-primary text-primary-fg px-4 py-1.5 rounded-xl hover:bg-primary-h transition-colors">
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
