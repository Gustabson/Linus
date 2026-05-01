"use client";

import { useState, useCallback, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  X, Minus, Send, Save, Loader2,
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Heading2,
} from "lucide-react";
import { UserSearchInput } from "./UserSearchInput";

interface Props {
  onClose: () => void;
}

type Minimized = boolean;

export function CorreosComposer({ onClose }: Props) {
  const [minimized, setMinimized]   = useState<Minimized>(false);
  const [subject, setSubject]       = useState("");
  const [recipient, setRecipient]   = useState<{ username: string; name: string } | null>(null);
  const [sending, startSend]        = useTransition();
  const [saving,  startSave]        = useTransition();
  const [error, setError]           = useState("");
  const [sent, setSent]             = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: "Escribí tu mensaje acá..." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[180px] px-4 py-3 text-gray-800",
      },
    },
  });

  const handleSend = useCallback(() => {
    if (!editor) return;
    setError("");
    const htmlBody = editor.getHTML();

    startSend(async () => {
      const res = await fetch("/api/correos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subject:           subject.trim(),
          htmlBody,
          recipientUsername: recipient?.username ?? null,
          isDraft:           false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al enviar el correo.");
        return;
      }
      setSent(true);
      setTimeout(onClose, 1500);
    });
  }, [editor, subject, recipient, onClose]);

  const handleSaveDraft = useCallback(() => {
    if (!editor) return;
    setError("");
    const htmlBody = editor.getHTML();

    startSave(async () => {
      const res = await fetch("/api/correos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subject:           subject.trim() || "Borrador sin título",
          htmlBody,
          recipientUsername: recipient?.username ?? null,
          isDraft:           true,
        }),
      });
      if (res.ok) onClose();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar el borrador.");
      }
    });
  }, [editor, subject, recipient, onClose]);

  function setLink() {
    if (!editor) return;
    const url = window.prompt("URL del enlace:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  const ToolBtn = ({
    onClick, active = false, title, children,
  }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className={`fixed bottom-0 right-6 z-50 w-[540px] bg-white rounded-t-2xl shadow-2xl border border-gray-200 border-b-0 flex flex-col transition-all ${
        minimized ? "h-12" : "h-auto max-h-[85vh]"
      }`}
    >
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-green-800 text-white px-4 py-3 rounded-t-2xl cursor-pointer select-none"
           onClick={() => setMinimized(!minimized)}>
        <span className="text-sm font-semibold">Nuevo correo</span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMinimized(!minimized)} className="hover:bg-green-700 p-1 rounded transition-colors" title="Minimizar">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded transition-colors" title="Cerrar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── To field ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 w-12 shrink-0">Para</span>
            <UserSearchInput value={recipient} onChange={setRecipient} />
          </div>

          {/* ── Subject field ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 w-12 shrink-0">Asunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              maxLength={200}
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* ── Toolbar ────────────────────────────────────────────── */}
          {editor && (
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 flex-wrap">
              <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")} title="Negrita">
                <Bold className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")} title="Cursiva">
                <Italic className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")} title="Subrayado">
                <UnderlineIcon className="w-3.5 h-3.5" />
              </ToolBtn>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive("heading", { level: 2 })} title="Título">
                <Heading2 className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")} title="Lista">
                <List className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")} title="Lista numerada">
                <ListOrdered className="w-3.5 h-3.5" />
              </ToolBtn>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}
                active={editor.isActive({ textAlign: "left" })} title="Alinear izquierda">
                <AlignLeft className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}
                active={editor.isActive({ textAlign: "center" })} title="Centrar">
                <AlignCenter className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}
                active={editor.isActive({ textAlign: "right" })} title="Alinear derecha">
                <AlignRight className="w-3.5 h-3.5" />
              </ToolBtn>
              <ToolBtn onClick={setLink}
                active={editor.isActive("link")} title="Enlace">
                <LinkIcon className="w-3.5 h-3.5" />
              </ToolBtn>
            </div>
          )}

          {/* ── Editor body ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-[180px]">
            <EditorContent editor={editor} />
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* ── Sent success ───────────────────────────────────────── */}
          {sent && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100">
              <p className="text-xs text-green-700 font-medium">✓ Correo enviado correctamente.</p>
            </div>
          )}

          {/* ── Footer actions ─────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Descartar
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving || sending}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />
                }
                Guardar borrador
              </button>
              <button
                onClick={handleSend}
                disabled={sending || saving}
                className="flex items-center gap-1.5 text-sm font-semibold bg-green-700 text-white px-4 py-1.5 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {sending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                  : <><Send className="w-3.5 h-3.5" /> Enviar</>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
