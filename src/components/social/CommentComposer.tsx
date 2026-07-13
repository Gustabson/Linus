"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { BookOpen, FileUp, Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import {
  COMMENT_ATTACHMENT_ACCEPT,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_LENGTH,
  type CommentAttachment,
  type SocialCommentData,
} from "@/lib/comments";
import { CONTENT_TYPE_STYLE, QUICK_EMOJIS } from "@/lib/constants";
import { CommentAttachmentPreview } from "./CommentAttachmentPreview";
import { TreePickerModal, type TreePickerResult } from "./TreePickerModal";

export function CommentComposer({
  postId,
  parentId = null,
  placeholder = "Escribí un comentario…",
  autoFocus = true,
  onCreated,
}: {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onCreated: (comment: SocialCommentData) => void;
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<CommentAttachment | null>(null);
  const [selectedTree, setSelectedTree] = useState<TreePickerResult | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTreePicker, setShowTreePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<CommentAttachment | null>(null);

  useEffect(() => {
    function closePickers(event: MouseEvent) {
      const target = event.target as Node;
      if (emojiRef.current && !emojiRef.current.contains(target)) setShowEmoji(false);
      if (attachMenuRef.current && !attachMenuRef.current.contains(target)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", closePickers);
    return () => document.removeEventListener("mousedown", closePickers);
  }, []);

  useEffect(() => () => {
    const pending = attachmentRef.current;
    if (!pending) return;
    void fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pending.url }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  function resize() {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function insertEmoji(emoji: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    setText(`${text.slice(0, start)}${emoji}${text.slice(end)}`);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
      resize();
    });
  }

  async function deleteUpload(value: CommentAttachment) {
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: value.url }),
    }).catch(() => undefined);
  }

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    setError("");
    if (file.size > MAX_COMMENT_ATTACHMENT_BYTES) {
      setError("El archivo supera el máximo de 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "comment");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo adjuntar el archivo.");
        return;
      }
      if (attachmentRef.current) void deleteUpload(attachmentRef.current);
      const uploaded = data as CommentAttachment;
      attachmentRef.current = uploaded;
      setAttachment(uploaded);
    } catch {
      setError("No se pudo conectar para adjuntar el archivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAttachment() {
    const current = attachmentRef.current;
    attachmentRef.current = null;
    setAttachment(null);
    if (current) await deleteUpload(current);
  }

  async function handleSend() {
    if ((!text.trim() && !attachment && !selectedTree) || sending || uploading) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text.trim(),
          attachment,
          linkedTreeId: selectedTree?.id ?? null,
          parentId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo publicar el comentario.");
        return;
      }
      attachmentRef.current = null;
      onCreated(data.comment);
      setText("");
      setAttachment(null);
      setSelectedTree(null);
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch {
      setError("No se pudo conectar. Intentá nuevamente.");
    } finally {
      setSending(false);
    }
  }

  const canSend = (text.trim().length > 0 || !!attachment || !!selectedTree)
    && text.length <= MAX_COMMENT_LENGTH
    && !sending
    && !uploading;

  return (
    <>
      <div className="space-y-2">
        {selectedTree && (
          <div
            className="relative max-w-md rounded-xl border border-l-4 border-border bg-surface p-3 sm:ml-9"
            style={{ borderInlineStartColor: `var(--${selectedTree.contentType.toLowerCase()})` }}
          >
            <div className="flex items-start gap-2.5 pr-7">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${CONTENT_TYPE_STYLE[selectedTree.contentType].iconBgCls}`}>
                {CONTENT_TYPE_STYLE[selectedTree.contentType].icon}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONTENT_TYPE_STYLE[selectedTree.contentType].badgeCls}`}>
                  {CONTENT_TYPE_STYLE[selectedTree.contentType].label}
                </span>
                <p className="mt-1 truncate text-sm font-bold text-text">{selectedTree.title}</p>
                <p className="truncate text-[11px] text-text-subtle">por {selectedTree.owner.name ?? selectedTree.owner.username ?? "Usuario"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTree(null)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-text-muted hover:bg-bg hover:text-danger"
              aria-label="Quitar contenido educativo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {attachment && (
          <div className="relative max-w-md sm:ml-9">
            <CommentAttachmentPreview attachment={attachment} />
            <button
              type="button"
              onClick={removeAttachment}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-text-muted shadow-sm backdrop-blur hover:text-danger"
              aria-label="Quitar archivo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <div className="h-7 w-7 shrink-0">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {(session?.user?.name ?? "?")[0]}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-xl border border-border bg-bg px-2 py-1.5 transition-colors focus-within:border-primary/40">
            <div className="relative shrink-0" ref={emojiRef}>
              <button
                type="button"
                onClick={() => {
                  setShowEmoji((value) => !value);
                  setShowAttachMenu(false);
                }}
                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${showEmoji ? "bg-primary/10 text-primary" : "text-text-subtle hover:bg-surface hover:text-primary"}`}
                aria-label="Agregar emoji"
                aria-expanded={showEmoji}
                aria-haspopup="dialog"
              >
                <Smile className="h-4 w-4" />
              </button>
              {showEmoji && (
                <div role="dialog" aria-label="Seleccionar emoji" className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-border bg-surface p-3 shadow-xl">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">Emojis</p>
                  <div className="flex flex-wrap gap-0.5">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        aria-label={`Agregar emoji ${emoji}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-bg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={COMMENT_ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />

            <div className="relative shrink-0" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu((value) => !value);
                  setShowEmoji(false);
                }}
                disabled={uploading}
                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-surface hover:text-primary disabled:opacity-50 ${showAttachMenu ? "bg-primary/10 text-primary" : "text-text-subtle"}`}
                title="Adjuntar contenido o archivo"
                aria-label="Adjuntar"
                aria-expanded={showAttachMenu}
                aria-haspopup="menu"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>

              {showAttachMenu && (
                <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowTreePicker(true);
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-semibold text-text">Kernel, módulo o recurso</span>
                      <span className="block text-[11px] text-text-muted">Desde Mi espacio o la comunidad</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileRef.current?.click();
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileUp className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-semibold text-text">Archivo o multimedia</span>
                      <span className="block text-[11px] text-text-muted">Imagen, GIF, video, PDF o DOCX</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <textarea
              ref={inputRef}
              autoFocus={autoFocus}
              value={text}
              onChange={(event) => { setText(event.target.value); resize(); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              rows={1}
              maxLength={MAX_COMMENT_LENGTH}
              className="min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed text-text placeholder:text-text-subtle focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-30"
              aria-label="Enviar comentario"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:pl-9">
          <p role="alert" aria-live="polite" className="min-h-4 text-xs text-danger">{error}</p>
          <p className="flex items-center gap-1 text-[10px] text-text-subtle">
            <FileUp className="h-3 w-3" /> Contenido, media, PDF o DOCX · máx. 10 MB
          </p>
        </div>
      </div>

      <TreePickerModal
        open={showTreePicker}
        onClose={() => setShowTreePicker(false)}
        onSelect={(tree) => {
          setSelectedTree(tree);
          setShowTreePicker(false);
          setError("");
        }}
      />
    </>
  );
}
