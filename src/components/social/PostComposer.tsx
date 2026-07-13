"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Image from "next/image";
import { Send, X, BookOpen, ChevronDown, Loader2, Smile } from "lucide-react";
import { CONTENT_TYPE_STYLE, QUICK_EMOJIS } from "@/lib/constants";
import type { PostData } from "./PostCard";
import { TreePickerModal, type TreePickerResult } from "@/components/shared/TreePickerModal";

interface Props {
  currentUser: {
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
  onPostCreated: (post: PostData) => void;
}

const MAX_CHARS = 2000;

export function PostComposer({ currentUser, onPostCreated }: Props) {
  const [content, setContent]         = useState("");
  const [attachedTree, setAttachedTree] = useState<TreePickerResult | null>(null);
  const [showTreePicker, setShowTreePicker] = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const [submitting, startSubmit]     = useTransition();
  const [error, setError]             = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef    = useRef<HTMLDivElement>(null);

  // Close emoji popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmoji(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) { setContent((c) => c + emoji); setShowEmoji(false); return; }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const next  = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    setShowEmoji(false);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  const charCount  = content.length;
  const overLimit  = charCount > MAX_CHARS;
  const canSubmit  = content.trim().length > 0 && !overLimit && !submitting;
  const isExpanded = expanded || content.length > 0 || !!attachedTree || showTreePicker;

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError("");

    startSubmit(async () => {
      const res  = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          content,
          treeId: attachedTree?.id ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al publicar");
        return;
      }

      const post = await res.json();
      onPostCreated(post);
      setContent("");
      setAttachedTree(null);
      setShowTreePicker(false);
      setExpanded(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }

  return (
    <>
    <div className="overflow-visible rounded-2xl border border-border bg-surface shadow-sm transition-shadow focus-within:shadow-md">
      <div className="flex gap-3 p-4 sm:p-5">
        {/* Avatar */}
        <div className="shrink-0">
          {currentUser.image ? (
            <Image
              src={currentUser.image}
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(currentUser.name ?? "?")[0]}
            </div>
          )}
        </div>

        {/* Text area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onFocus={() => setExpanded(true)}
            onChange={(e) => { setContent(e.target.value); autoResize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder="Compartí algo con la comunidad…"
            rows={isExpanded ? 2 : 1}
            className="min-h-7 w-full resize-none overflow-hidden bg-transparent text-[15px] leading-relaxed text-text placeholder:text-text-subtle focus:outline-none"
          />

          {/* Attached tree preview */}
          {attachedTree && (
            <div className="mt-2 border border-border rounded-xl p-3 flex items-start gap-2.5 bg-bg">
              {(() => {
                const badge = CONTENT_TYPE_STYLE[attachedTree.contentType];
                return <span className={`shrink-0 mt-0.5 ${badge.textCls}`}>{badge.icon}</span>;
              })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {(() => {
                    const badge = CONTENT_TYPE_STYLE[attachedTree.contentType];
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.badgeCls}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm font-semibold text-text line-clamp-1">{attachedTree.title}</p>
                <p className="text-xs text-text-subtle">por {attachedTree.owner.name}</p>
              </div>
              <button
                onClick={() => setAttachedTree(null)}
                className="shrink-0 text-text-subtle hover:text-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
      <div className="space-y-3 border-t border-border-subtle px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
      <button
        type="button"
        onClick={() => setShowTreePicker(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg hover:text-primary"
        aria-haspopup="dialog"
      >
        <BookOpen className="w-4 h-4" />
        {attachedTree ? "Cambiar contenido adjunto" : "Adjuntar kernel / módulo / recurso"}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Footer: emoji + char count + submit */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Emoji picker */}
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              title="Emojis"
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${showEmoji ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-primary"}`}
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-2xl shadow-xl z-50 p-3">
                <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wide mb-2">Emojis</p>
                <div className="flex flex-wrap gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-bg rounded-lg transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className={`text-xs ${overLimit ? "font-medium text-danger" : "text-text-subtle"}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-h disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
              : <><Send className="w-3.5 h-3.5" /> Publicar</>
            }
          </button>
        </div>
      </div>
      </div>
      )}
    </div>
    <TreePickerModal
      open={showTreePicker}
      onClose={() => setShowTreePicker(false)}
      onSelect={(tree) => {
        setAttachedTree(tree);
        setShowTreePicker(false);
        setExpanded(true);
        setError("");
      }}
    />
    </>
  );
}
