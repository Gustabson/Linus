"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
  const [, setSelTick] = useState(0);

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

  // Re-render toolbar when cursor moves (TipTap v3 doesn't do this automatically)
  useEffect(() => {
    if (!editor) return;
    const refresh = () => setSelTick(t => t + 1);
    editor.on("selectionUpdate", refresh);
    return () => { editor.off("selectionUpdate", refresh); };
  }, [editor]);

  if (!editor) return null;

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
          {btn(editor.isActive("bold"),      () => editor.chain().focus().toggleBold().run(),      "Negrita",        <Bold           className="w-4 h-4" />)}
          {btn(editor.isActive("italic"),    () => editor.chain().focus().toggleItalic().run(),    "Cursiva",        <Italic         className="w-4 h-4" />)}
          {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Subrayado",      <UnderlineIcon  className="w-4 h-4" />)}
          {btn(editor.isActive("strike"),    () => editor.chain().focus().toggleStrike().run(),    "Tachado",        <Strikethrough  className="w-4 h-4" />)}

          {/* Highlight con colores inline */}
          <button
            type="button"
            title="Resaltado"
            onMouseDown={(e) => { e.preventDefault(); setShowHighlightColors(v => !v); }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              editor.isActive("highlight") || showHighlightColors
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
          {btn(editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), "Párrafo normal",
            <span className="text-[11px] font-bold leading-none w-4 h-4 flex items-center justify-center">P</span>)}
          {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Título pequeño (H3)", <Heading3 className="w-4 h-4" />)}
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título mediano (H2)", <Heading2 className="w-4 h-4" />)}
          {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Título grande (H1)",  <Heading1 className="w-4 h-4" />)}

          {sep}

          {btn(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  "Lista",          <List         className="w-4 h-4" />)}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada", <ListOrdered  className="w-4 h-4" />)}
          {btn(editor.isActive("blockquote"),  () => editor.chain().focus().toggleBlockquote().run(),  "Cita",           <Quote        className="w-4 h-4" />)}

          {sep}

          {btn(editor.isActive("code"),      () => editor.chain().focus().toggleCode().run(),      "Código inline",  <Code    className="w-4 h-4" />)}
          {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "Bloque código",  <CodeXml className="w-4 h-4" />)}
          {btn(false, () => editor.chain().focus().setHorizontalRule().run(), "Separador", <Minus className="w-4 h-4" />)}

          {sep}

          {btn(editor.isActive({ textAlign: "left" }),   () => editor.chain().focus().setTextAlign("left").run(),   "Izquierda", <AlignLeft   className="w-4 h-4" />)}
          {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Centro",    <AlignCenter className="w-4 h-4" />)}

          {sep}

          {btn(false, () => {
            const url = prompt("URL del enlace:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }, "Enlace", <LinkIcon className="w-4 h-4" />)}

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
    </div>
  );
}
