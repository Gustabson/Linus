"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Highlighter, Quote,
  Code, CodeXml, Minus, Link as LinkIcon, Undo, Redo, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static data ───────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecdd3", "#fed7aa"];

const EMOJI_GROUPS = [
  { label: "Frecuentes",  emojis: ["😊","👍","❤️","🎉","🙏","😂","🔥","✅","⭐","💡","📚","✏️","🧠","🎓","💪"] },
  { label: "Académico",   emojis: ["📖","📝","📌","📎","🔍","📊","📈","🧪","🔬","⚗️","🧮","📐","📏","💻","🖊️"] },
  { label: "Expresiones", emojis: ["😀","😎","🤔","🤩","😍","🥳","😅","🤗","👏","🙌","💯","🚀","⚡","🌟","✨"] },
  { label: "Naturaleza",  emojis: ["🌱","🌿","🍃","🌸","🌍","🌊","🦋","🐦","🌞","🌈","❄️","🍀","🌻","🌺","🍁"] },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface RichEditorProps {
  // Content — use one format
  initialContent?:     string;        // HTML string (for correos)
  initialContentJson?: object | null; // TipTap JSON  (for kernel/módulo)
  onChange?:     (html: string) => void;
  onChangeJson?: (json: object) => void;

  placeholder?:    string;
  editable?:       boolean;
  minHeight?:      string;   // CSS value e.g. "200px"
  compact?:        boolean;  // smaller icons/padding — for email composer
  scrollable?:     boolean;  // content area fills remaining height and scrolls internally
  contentClassName?: string; // class on the content wrapper (default "p-4")

  // Optional feature flags (all off by default)
  showStrike?:    boolean;
  showEmoji?:     boolean;
  showCode?:      boolean;   // Code inline + CodeBlock + HorizontalRule
  showUndoRedo?:  boolean;
  showCharCount?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RichEditor({
  initialContent,
  initialContentJson,
  onChange,
  onChangeJson,
  placeholder      = "Empezá a escribir...",
  editable         = true,
  minHeight        = "200px",
  compact          = false,
  scrollable       = false,
  contentClassName,
  showStrike       = false,
  showEmoji        = false,
  showCode         = false,
  showUndoRedo     = false,
  showCharCount    = false,
}: RichEditorProps) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showHighlight, setShowHighlight] = useState(false);
  const [linkOpen,      setLinkOpen]      = useState(false);
  const [linkUrl,       setLinkUrl]       = useState("");
  const [showEmojis,    setShowEmojis]    = useState(false);
  const [emojiStyle,    setEmojiStyle]    = useState<CSSProperties>({});
  const emojiBtnRef  = useRef<HTMLButtonElement>(null);
  const emojiDropRef = useRef<HTMLDivElement>(null);

  // ── Editor ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: initialContentJson ?? initialContent ?? "",
    editable,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
      onChangeJson?.(editor.getJSON());
    },
  });

  // Re-sync when initial content loads asynchronously
  useEffect(() => {
    if (!editor || !editor.isEmpty) return;
    if (initialContent)     editor.commands.setContent(initialContent);
    if (initialContentJson) editor.commands.setContent(initialContentJson);
  }, [editor, initialContent, initialContentJson]);

  // ── Reactive toolbar state (TipTap v3) ───────────────────────────────────
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
      alignRight:  ctx.editor?.isActive({ textAlign: "right"  }) ?? false,
    }),
  });

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojis) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!emojiDropRef.current?.contains(t) && !emojiBtnRef.current?.contains(t))
        setShowEmojis(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showEmojis]);

  if (!editor) return null;

  // ── Style helpers ────────────────────────────────────────────────────────
  const iconCls = compact ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnBase = compact ? "p-1.5 rounded-lg" : "p-1.5 rounded-md";

  function btn(active: boolean, onClick: () => void, title: string, icon: React.ReactNode) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={cn(
          btnBase, "transition-colors shrink-0",
          active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-subtle hover:text-text",
        )}
      >
        {icon}
      </button>
    );
  }

  function Sep() {
    return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;
  }

  // ── Link handlers ────────────────────────────────────────────────────────
  function openLinkModal() {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    const raw = linkUrl.trim();
    if (!raw) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  // ── Emoji handler ────────────────────────────────────────────────────────
  function toggleEmoji() {
    if (!showEmojis && emojiBtnRef.current) {
      const r    = emojiBtnRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.round((window.innerWidth - 288) / 2));
      setEmojiStyle({ position: "fixed", top: r.bottom + 4, left, zIndex: 200 });
    }
    setShowEmojis(v => !v);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const contentCls = contentClassName ?? "p-4";

  return (
    <div className={cn(scrollable && "flex flex-col h-full")}>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      {editable && (
        <div className={cn(
          "flex flex-wrap items-center gap-0.5 border-b border-border-subtle bg-bg",
          compact ? "px-3 py-1.5" : "p-2",
        )}>

          {/* Format */}
          {btn(is.bold,      () => editor.chain().focus().toggleBold().run(),      "Negrita",   <Bold          className={iconCls} />)}
          {btn(is.italic,    () => editor.chain().focus().toggleItalic().run(),    "Cursiva",   <Italic        className={iconCls} />)}
          {btn(is.underline, () => editor.chain().focus().toggleUnderline().run(), "Subrayado", <UnderlineIcon className={iconCls} />)}
          {showStrike && btn(is.strike, () => editor.chain().focus().toggleStrike().run(), "Tachado", <Strikethrough className={iconCls} />)}

          {/* Highlight */}
          <button type="button" title="Resaltado"
            onMouseDown={(e) => { e.preventDefault(); setShowHighlight(v => !v); }}
            className={cn(btnBase, "transition-colors shrink-0",
              is.highlight || showHighlight ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-subtle hover:text-text"
            )}
          >
            <Highlighter className={iconCls} />
          </button>
          {showHighlight && (
            <>
              {HIGHLIGHT_COLORS.map(color => (
                <button key={color} type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setHighlight({ color }).run(); setShowHighlight(false); }}
                  className="w-5 h-5 rounded border border-border/60 hover:scale-110 transition-transform shrink-0"
                  style={{ backgroundColor: color }} />
              ))}
              <button type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                className="w-5 h-5 rounded border border-border flex items-center justify-center text-[10px] text-text-muted hover:text-text hover:bg-bg transition-colors shrink-0"
              >✕</button>
            </>
          )}

          <Sep />

          {/* Headings: P → H3 → H2 → H1 */}
          {btn(is.paragraph, () => editor.chain().focus().setParagraph().run(), "Párrafo",
            <span className={cn("font-bold leading-none", compact ? "text-[11px]" : "text-xs")}>P</span>
          )}
          {btn(is.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Título H3", <Heading3 className={iconCls} />)}
          {btn(is.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título H2", <Heading2 className={iconCls} />)}
          {btn(is.h1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Título H1", <Heading1 className={iconCls} />)}

          <Sep />

          {/* Lists & quote */}
          {btn(is.bulletList,  () => editor.chain().focus().toggleBulletList().run(),  "Lista",          <List        className={iconCls} />)}
          {btn(is.orderedList, () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada", <ListOrdered className={iconCls} />)}
          {btn(is.blockquote,  () => editor.chain().focus().toggleBlockquote().run(),  "Cita",           <Quote       className={iconCls} />)}

          {/* Code tools */}
          {showCode && (
            <>
              <Sep />
              {btn(is.code,      () => editor.chain().focus().toggleCode().run(),        "Código inline", <Code    className={iconCls} />)}
              {btn(is.codeBlock, () => editor.chain().focus().toggleCodeBlock().run(),   "Bloque código", <CodeXml className={iconCls} />)}
              {btn(false,        () => editor.chain().focus().setHorizontalRule().run(), "Separador",     <Minus   className={iconCls} />)}
            </>
          )}

          <Sep />

          {/* Alignment */}
          {btn(is.alignLeft,   () => editor.chain().focus().setTextAlign("left").run(),   "Izquierda", <AlignLeft   className={iconCls} />)}
          {btn(is.alignCenter, () => editor.chain().focus().setTextAlign("center").run(), "Centrar",   <AlignCenter className={iconCls} />)}
          {btn(is.alignRight,  () => editor.chain().focus().setTextAlign("right").run(),  "Derecha",   <AlignRight  className={iconCls} />)}

          <Sep />

          {/* Link */}
          {btn(is.link, openLinkModal, "Enlace", <LinkIcon className={iconCls} />)}

          {/* Emoji */}
          {showEmoji && (
            <button ref={emojiBtnRef} type="button" title="Emojis"
              onMouseDown={(e) => { e.preventDefault(); toggleEmoji(); }}
              className={cn(btnBase, "transition-colors shrink-0",
                showEmojis ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-subtle hover:text-text"
              )}
            >
              <Smile className={iconCls} />
            </button>
          )}

          {/* Undo / Redo */}
          {showUndoRedo && (
            <>
              <Sep />
              {btn(false, () => editor.chain().focus().undo().run(), "Deshacer", <Undo className={iconCls} />)}
              {btn(false, () => editor.chain().focus().redo().run(), "Rehacer",  <Redo className={iconCls} />)}
            </>
          )}

          {/* Character count */}
          {showCharCount && (
            <span className="ml-auto text-xs text-text-subtle shrink-0">
              {editor.storage.characterCount?.characters() ?? 0} caracteres
            </span>
          )}
        </div>
      )}

      {/* ── Content area ────────────────────────────────────────────── */}
      <div className={cn(scrollable && "flex-1 overflow-y-auto", contentCls)}>
        <EditorContent editor={editor} className="tiptap" style={{ minHeight }} />
      </div>

      {/* ── Emoji picker (fixed — escapes overflow-hidden) ───────────── */}
      {showEmoji && showEmojis && (
        <div ref={emojiDropRef} style={emojiStyle}
          className="w-72 bg-surface border border-border rounded-2xl shadow-xl p-3 space-y-2 overflow-y-auto max-h-72"
        >
          {EMOJI_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wide mb-1">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map(emoji => (
                  <button key={emoji} type="button"
                    onClick={() => { editor.chain().focus().insertContent(emoji).run(); setShowEmojis(false); }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-bg rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Link modal ──────────────────────────────────────────────── */}
      {linkOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setLinkOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-surface rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm space-y-3 pointer-events-auto">
              <p className="text-sm font-semibold text-text">Insertar enlace</p>
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
                placeholder="https://ejemplo.com"
                autoFocus
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-bg text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center gap-2 justify-end">
                {is.link && (
                  <button type="button"
                    onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
                    className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors mr-auto"
                  >
                    Quitar enlace
                  </button>
                )}
                <button type="button" onClick={() => setLinkOpen(false)}
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
