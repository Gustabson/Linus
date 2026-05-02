"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import {
  ArrowLeft, Trash2, Reply, Send, Loader2,
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Heading2, Heading3,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Highlighter, Smile,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserMini {
  id:       string;
  name:     string | null;
  username: string | null;
  image:    string | null;
}

interface CorreoRespuesta {
  id:        string;
  body:      string;
  createdAt: string;
  sender:    UserMini;
}

interface CorreoDetalle {
  id:          string;
  subject:     string;
  body:        string;
  createdAt:   string;
  sender:      UserMini;
  recipient:   UserMini | null;
  replies:     CorreoRespuesta[];
}

interface Props {
  message:       CorreoDetalle;
  currentUserId: string;
  isRecipient:   boolean;
  backHref:      string;
  backLabel:     string;
}

// ── Shared toolbar button ────────────────────────────────────────────────────
function ToolBtn({
  onClick, active = false, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:bg-border-subtle hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

// ── Reply composer with full TipTap editor ────────────────────────────────
function ReplyComposer({
  onSend,
  onCancel,
  sending,
}: {
  onSend:   (html: string) => void;
  onCancel: () => void;
  sending:  boolean;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
    { label: "Frecuentes",  emojis: ["😊","👍","❤️","🎉","🙏","😂","🔥","✅","⭐","💡","📚","✏️","🧠","🎓","💪"] },
    { label: "Académico",   emojis: ["📖","📝","📌","📎","🔍","📊","📈","🧪","🔬","⚗️","🧮","📐","📏","💻","🖊️"] },
    { label: "Expresiones", emojis: ["😀","😎","🤔","🤩","😍","🥳","😅","🤗","👏","🙌","💯","🚀","⚡","🌟","✨"] },
  ];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmoji(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      Superscript,
      Subscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapLink.configure({
        openOnClick:    false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: "Escribí tu respuesta..." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[160px] px-1 py-2 text-text",
      },
    },
    content: "",
  });

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url  = window.prompt("URL del enlace:", prev ?? "https://");
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }

  function handleSend() {
    if (!editor || editor.isEmpty) return;
    onSend(editor.getHTML());
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <p className="text-sm font-medium text-text px-4 pt-4 pb-2">Tu respuesta</p>

      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-y border-border-subtle flex-wrap bg-bg">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")} title="Negrita">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")} title="Cursiva">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")} title="Subrayado">
            <UnderlineIcon className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })} title="Título H2">
            <Heading2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })} title="Título H3">
            <Heading3 className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")} title="Lista con viñetas">
            <List className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")} title="Lista numerada">
            <ListOrdered className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })} title="Izquierda">
            <AlignLeft className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })} title="Centrar">
            <AlignCenter className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })} title="Derecha">
            <AlignRight className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Resaltado">
            <Highlighter className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Superíndice">
            <SuperscriptIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subíndice">
            <SubscriptIcon className="w-4 h-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Enlace">
            <LinkIcon className="w-4 h-4" />
          </ToolBtn>

          {/* Emoji picker */}
          <div className="relative" ref={emojiRef}>
            <ToolBtn onClick={() => setShowEmoji((v) => !v)} active={showEmoji} title="Emojis">
              <Smile className="w-4 h-4" />
            </ToolBtn>
            {showEmoji && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-2xl shadow-xl z-50 p-3 space-y-2">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wide mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {group.emojis.map((emoji) => (
                        <button key={emoji} type="button"
                          onClick={() => { editor.chain().focus().insertContent(emoji).run(); setShowEmoji(false); }}
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

      {/* Editor area */}
      <div className="px-4 py-3 min-h-[160px]">
        <EditorContent editor={editor} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 px-4 pb-4 pt-2 border-t border-border-subtle">
        <button
          onClick={onCancel}
          className="text-sm text-text-muted px-4 py-2 rounded-xl hover:bg-bg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !editor || editor.isEmpty}
          className="flex items-center gap-2 text-sm font-semibold bg-primary text-primary-fg px-4 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors"
        >
          {sending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
            : <><Send className="w-3.5 h-3.5" /> Enviar</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CorreosDetalle({ message, currentUserId, isRecipient, backHref, backLabel }: Props) {
  const router = useRouter();
  const [showReply, setShowReply]   = useState(false);
  const [replies, setReplies]       = useState<CorreoRespuesta[]>(message.replies);
  const [deleting, startDelete]     = useTransition();
  const [sending,  startSend]       = useTransition();
  const [error, setError]           = useState("");

  // Notify sidebar immediately when a received message is opened (already marked read server-side)
  useEffect(() => {
    if (isRecipient) {
      window.dispatchEvent(new CustomEvent("correos:read"));
    }
  }, [isRecipient]);

  function handleDelete() {
    startDelete(async () => {
      const res = await fetch(`/api/correos/${message.id}`, { method: "DELETE" });
      if (res.ok) router.push("/correos");
      else setError("No se pudo eliminar el mensaje.");
    });
  }

  function handleReply(htmlBody: string) {
    setError("");
    startSend(async () => {
      const res = await fetch(`/api/correos/${message.id}/reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ htmlBody }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplies((prev) => [...prev, { ...data, createdAt: data.createdAt }]);
        setShowReply(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar la respuesta.");
      }
    });
  }

  const avatarFor = (user: UserMini) =>
    user.image ? (
      <Image src={user.image} alt="" width={40} height={40} className="rounded-full shrink-0" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {(user.name ?? "?")[0].toUpperCase()}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Back */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Subject */}
      <h1 className="text-2xl font-bold text-text mb-6 leading-snug">
        {message.subject}
      </h1>

      {/* Main message card */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        {/* Sender row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatarFor(message.sender)}
            <div>
              <p className="font-semibold text-text text-sm">
                {message.sender.name ?? "Usuario"}
                {message.sender.username && (
                  <span className="font-normal text-text-subtle ml-1">
                    @{message.sender.username}
                  </span>
                )}
              </p>
              {message.recipient && (
                <p className="text-xs text-text-subtle">
                  Para: {message.recipient.name ?? "Usuario"}
                  {message.recipient.username && ` (@${message.recipient.username})`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-subtle">
              {formatDate(new Date(message.createdAt))}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Eliminar"
              className="p-1.5 rounded-lg text-text-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border-subtle" />

        {/* S8 ⚠ SECURITY: dangerouslySetInnerHTML is safe ONLY because
            message.body is sanitized server-side via sanitize-html before storage.
            See src/lib/sanitize.ts + src/app/api/correos/route.ts.
            DO NOT remove or weaken that sanitization — stored XSS risk. */}
        <div
          className="prose prose-sm max-w-none text-text"
          dangerouslySetInnerHTML={{ __html: message.body }}
        />
      </div>

      {/* Thread replies */}
      {replies.length > 0 && (
        <div className="mt-4 space-y-3 pl-6 border-l-2 border-border-subtle">
          {replies.map((reply) => (
            <div key={reply.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center gap-2.5 mb-3">
                {avatarFor(reply.sender)}
                <div>
                  <p className="font-semibold text-text text-sm">{reply.sender.name}</p>
                  <p className="text-xs text-text-subtle">{formatDate(new Date(reply.createdAt))}</p>
                </div>
              </div>
              {/* S8 ⚠ SECURITY: see comment above — sanitized server-side */}
              <div
                className="prose prose-sm max-w-none text-text"
                dangerouslySetInnerHTML={{ __html: reply.body }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reply area — only recipient can reply */}
      {isRecipient && (
        <div className="mt-6">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-2 text-sm font-medium text-primary border border-primary/20 px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors"
            >
              <Reply className="w-4 h-4" />
              Responder
            </button>
          ) : (
            <ReplyComposer
              onSend={handleReply}
              onCancel={() => { setShowReply(false); setError(""); }}
              sending={sending}
            />
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
