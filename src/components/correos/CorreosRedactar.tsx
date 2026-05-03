"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Send, Save, Loader2, Trash2,
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Heading2, Heading3, Smile,
  Check,
} from "lucide-react";
import { UserSearchInput } from "./UserSearchInput";

// ── Emoji data ─────────────────────────────────────────────────────────────────
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Frecuentes",  emojis: ["😊","👍","❤️","🎉","🙏","😂","🔥","✅","⭐","💡","📚","✏️","🧠","🎓","💪"] },
  { label: "Académico",   emojis: ["📖","📝","📌","📎","🔍","📊","📈","🧪","🔬","⚗️","🧮","📐","📏","💻","🖊️"] },
  { label: "Expresiones", emojis: ["😀","😎","🤔","🤩","😍","🥳","😅","🤗","👏","🙌","💯","🚀","⚡","🌟","✨"] },
  { label: "Naturaleza",  emojis: ["🌱","🌿","🍃","🌸","🌍","🌊","🦋","🐦","🌞","🌈","❄️","🍀","🌻","🌺","🍁"] },
];

interface Props {
  draftId?:          string;
  initialSubject?:   string;
  initialBody?:      string;
  initialRecipient?: { username: string; name: string } | null;
}

export function CorreosRedactar({
  draftId,
  initialSubject   = "",
  initialBody      = "",
  initialRecipient = null,
}: Props) {
  const router         = useRouter();
  const isEditingDraft = !!draftId;

  const [subject,   setSubject]   = useState(initialSubject);
  const [recipient, setRecipient] = useState<{ username: string; name: string } | null>(initialRecipient);
  const [sending,   startSend]    = useTransition();
  const [saving,    startSave]    = useTransition();
  const [error,     setError]     = useState("");
  const [sent,      setSent]      = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // ── Auto-save state ───────────────────────────────────────────────────────
  const savedDraftId    = useRef<string | null>(draftId ?? null);
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectRef      = useRef(subject);
  const sentRef         = useRef(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => { subjectRef.current  = subject; }, [subject]);
  useEffect(() => { sentRef.current     = sent;    }, [sent]);

  // ── Editor ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapLink.configure({
        openOnClick:    false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: "Escribí tu mensaje acá..." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-base max-w-none focus:outline-none min-h-[280px] px-1 py-2 text-text",
      },
    },
    content: initialBody || "",
  });

  useEffect(() => {
    if (editor && initialBody && editor.isEmpty) {
      editor.commands.setContent(initialBody);
    }
  }, [editor, initialBody]);

  // ── Auto-save logic ───────────────────────────────────────────────────────
  const doAutoSave = useCallback(async (subj: string, html: string) => {
    const hasContent = subj.trim() || (html && html !== "<p></p>");
    if (!hasContent || sentRef.current) return;

    setAutoSaveState("saving");
    try {
      let res: Response;
      if (savedDraftId.current) {
        res = await fetch(`/api/correos/${savedDraftId.current}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ subject: subj || "Borrador sin título", htmlBody: html, isDraft: true }),
        });
      } else {
        res = await fetch("/api/correos", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ subject: subj || "Borrador sin título", htmlBody: html, isDraft: true }),
        });
        if (res.ok) {
          const data = await res.json();
          savedDraftId.current = data.id;
        }
      }
      setAutoSaveState(res.ok ? "saved" : "idle");
    } catch {
      setAutoSaveState("idle");
    }
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (sentRef.current || !editor) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveState("idle");
    const subj = subjectRef.current;
    const html = editor.getHTML();
    autoSaveTimer.current = setTimeout(() => doAutoSave(subj, html), 5 * 60 * 1000); // 5 min
  }, [editor, doAutoSave]);

  // Listen for editor content changes
  useEffect(() => {
    if (!editor) return;
    editor.on("update", triggerAutoSave);
    return () => { editor.off("update", triggerAutoSave); };
  }, [editor, triggerAutoSave]);

  // Listen for subject changes
  useEffect(() => {
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // ── Close emoji on outside click ─────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmoji(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!editor) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); // cancel pending auto-save
    setError("");
    const htmlBody = editor.getHTML();
    const idToUse  = savedDraftId.current;

    startSend(async () => {
      let res: Response;
      if (idToUse) {
        res = await fetch(`/api/correos/${idToUse}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, htmlBody, recipientUsername: recipient?.username ?? null, isDraft: false }),
        });
      } else {
        res = await fetch("/api/correos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, htmlBody, recipientUsername: recipient?.username ?? null, isDraft: false }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Error al enviar el correo."); return; }
      setSent(true);
      setTimeout(() => router.push("/correos/enviados"), 1200);
    });
  }, [editor, subject, recipient, router]);

  // ── Save draft (desktop explicit button) ─────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    if (!editor) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setError("");
    const htmlBody = editor.getHTML();
    const idToUse  = savedDraftId.current;

    startSave(async () => {
      let res: Response;
      if (idToUse) {
        res = await fetch(`/api/correos/${idToUse}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject || "Borrador sin título", htmlBody, recipientUsername: recipient?.username ?? null, isDraft: true }),
        });
      } else {
        res = await fetch("/api/correos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject || "Borrador sin título", htmlBody, recipientUsername: recipient?.username ?? null, isDraft: true }),
        });
      }
      if (res.ok) router.push("/correos/borradores");
      else { const data = await res.json().catch(() => ({})); setError(data.error ?? "Error al guardar el borrador."); }
    });
  }, [editor, subject, recipient, router]);

  function handleDiscard() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    router.push(isEditingDraft ? "/correos/borradores" : "/correos");
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url  = window.prompt("URL del enlace:", prev ?? "https://");
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }

  function insertEmoji(emoji: string) {
    editor?.chain().focus().insertContent(emoji).run();
    setShowEmoji(false);
  }

  // ── Toolbar button ────────────────────────────────────────────────────────
  const ToolBtn = ({
    onClick, active = false, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:bg-border-subtle hover:text-text"
      }`}
    >
      {children}
    </button>
  );

  // ── Auto-save status label ────────────────────────────────────────────────
  const AutoSaveLabel = () => {
    if (autoSaveState === "saving") return (
      <span className="flex items-center gap-1 text-xs text-text-subtle">
        <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
      </span>
    );
    if (autoSaveState === "saved") return (
      <span className="flex items-center gap-1 text-xs text-text-subtle">
        <Check className="w-3 h-3 text-green-500" /> Guardado
      </span>
    );
    return null;
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Header — desktop ────────────────────────────────────────── */}
      <div className="hidden sm:flex px-6 py-4 border-b border-border-subtle items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-text text-base">
            {isEditingDraft ? "Editar borrador" : "Nuevo correo"}
          </h2>
          <AutoSaveLabel />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDiscard} disabled={sending || saving}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
            {isEditingDraft ? "Cancelar" : "Descartar"}
          </button>
          <button onClick={handleSaveDraft} disabled={saving || sending}
            className="flex items-center gap-1.5 text-sm text-text-muted border border-border px-4 py-2 rounded-xl hover:bg-bg disabled:opacity-50 transition-colors">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> Guardar borrador</>}
          </button>
          <button onClick={handleSend} disabled={sending || saving}
            className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-fg px-5 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors shadow-sm">
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar</>}
          </button>
        </div>
      </div>

      {/* ── Header — mobile ─────────────────────────────────────────── */}
      <div className="flex sm:hidden items-center gap-1 px-2 py-2.5 border-b border-border-subtle">
        <AutoSaveLabel />
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={handleDiscard} disabled={sending || saving}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-red-500 px-2.5 py-2 rounded-xl hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Descartar
          </button>
          <button onClick={handleSaveDraft} disabled={saving || sending}
            className="flex items-center gap-1 text-sm text-text-muted border border-border px-2.5 py-2 rounded-xl hover:bg-bg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          <button onClick={handleSend} disabled={sending || saving}
            className="flex items-center gap-1 text-sm font-semibold bg-primary text-primary-fg px-3 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
      </div>

      {/* ── Fields ──────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle divide-y divide-border-subtle">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <span className="text-sm text-text-subtle w-12 sm:w-16 shrink-0">Para</span>
          <UserSearchInput value={recipient} onChange={setRecipient} />
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <span className="text-sm text-text-subtle w-12 sm:w-16 shrink-0">Asunto</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo" maxLength={200}
            className="flex-1 text-sm text-text placeholder:text-text-subtle focus:outline-none" />
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      {editor && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border-subtle flex-wrap bg-bg">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrita"><Bold className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Cursiva"><Italic className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Subrayado"><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título H2"><Heading2 className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título H3"><Heading3 className="w-3.5 h-3.5" /></ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista con viñetas"><List className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Izquierda"><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrar"><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Derecha"><AlignRight className="w-3.5 h-3.5" /></ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Enlace"><LinkIcon className="w-3.5 h-3.5" /></ToolBtn>

          {/* Emoji picker */}
          <div className="relative" ref={emojiRef}>
            <ToolBtn onClick={() => setShowEmoji((v) => !v)} active={showEmoji} title="Emojis">
              <Smile className="w-3.5 h-3.5" />
            </ToolBtn>
            {showEmoji && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-surface border border-border rounded-2xl shadow-xl z-50 p-3 space-y-2">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wide mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {group.emojis.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-bg rounded-lg transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Editor ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <EditorContent editor={editor} />
      </div>

      {/* ── Feedback ────────────────────────────────────────────────── */}
      {(error || sent) && (
        <div className={`px-6 py-3 border-t text-sm font-medium ${
          sent ? "bg-primary/5 border-primary/10 text-primary"
               : "bg-red-50 border-red-100 text-red-600"
        }`}>
          {sent ? "✓ Correo enviado. Redirigiendo..." : error}
        </div>
      )}
    </div>
  );
}
