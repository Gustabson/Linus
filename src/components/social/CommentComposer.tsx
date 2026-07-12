"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import {
  COMMENT_ATTACHMENT_ACCEPT,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_LENGTH,
  type CommentAttachment,
  type SocialCommentData,
} from "@/lib/comments";
import { QUICK_EMOJIS } from "@/lib/constants";
import { CommentAttachmentPreview } from "./CommentAttachmentPreview";

export function CommentComposer({
  postId,
  onCreated,
}: {
  postId: string;
  onCreated: (comment: SocialCommentData) => void;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<CommentAttachment | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closePicker(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setShowEmoji(false);
    }
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
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
      if (attachment) void deleteUpload(attachment);
      setAttachment(data as CommentAttachment);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAttachment() {
    const current = attachment;
    setAttachment(null);
    if (current) await deleteUpload(current);
  }

  async function handleSend() {
    if ((!text.trim() && !attachment) || sending || uploading) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim(), attachment }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo publicar el comentario.");
        return;
      }
      onCreated(data.comment);
      setText("");
      setAttachment(null);
      if (inputRef.current) inputRef.current.style.height = "auto";
    } finally {
      setSending(false);
    }
  }

  const canSend = (text.trim().length > 0 || !!attachment)
    && text.length <= MAX_COMMENT_LENGTH
    && !sending
    && !uploading;

  return (
    <div className="space-y-2">
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
        <div className="hidden w-7 shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-xl border border-border bg-bg px-2 py-1.5 transition-colors focus-within:border-primary/40">
          <div className="relative shrink-0" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setShowEmoji((value) => !value)}
              className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${showEmoji ? "bg-primary/10 text-primary" : "text-text-subtle hover:bg-surface hover:text-primary"}`}
              aria-label="Agregar emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-border bg-surface p-3 shadow-xl">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">Emojis</p>
                <div className="flex flex-wrap gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface hover:text-primary disabled:opacity-50"
            title="Adjuntar imagen, GIF, video, PDF o Word"
            aria-label="Adjuntar archivo"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>

          <textarea
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(event) => { setText(event.target.value); resize(); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Escribí un comentario…"
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
        <p className="min-h-4 text-xs text-danger">{error}</p>
        <p className="flex items-center gap-1 text-[10px] text-text-subtle">
          <FileUp className="h-3 w-3" /> GIF, media, PDF o Word · máx. 10 MB
        </p>
      </div>
    </div>
  );
}
