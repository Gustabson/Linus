"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, GitFork, Send, Loader2, Trash2, MoreHorizontal, Flag, ArrowUpRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

export interface PostData {
  id:        string;
  content:   string;
  imageUrl:  string | null;
  createdAt: string;
  author: {
    id:       string;
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
  tree: {
    id:          string;
    slug:        string;
    title:       string;
    description: string | null;
    contentType: ContentType;
    forkDepth:   number;
    owner: { username: string | null; name: string | null };
    _count: { likes: number; forks: number };
  } | null;
  _count:     { likes: number; comments: number };
  likes:      { id: string }[];
  isAuthenticated?: boolean;
}

interface PostComment {
  id:        string;
  content:   string;
  createdAt: string;
  author: {
    id:       string;
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
}

// ── Report reasons ───────────────────────────────────────────────────────────
const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "spam",           label: "Spam o publicidad" },
  { value: "inappropriate",  label: "Contenido inapropiado" },
  { value: "misinformation", label: "Información falsa" },
  { value: "other",          label: "Otro motivo" },
];

// ── Post options dropdown (delete for owner / report for others) ──────────────
function PostOptions({
  postId,
  isOwner,
  onDeleted,
}: {
  postId:    string;
  isOwner:   boolean;
  onDeleted: () => void;
}) {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState<"menu" | "report" | "done">("menu");
  const [reason,    setReason]    = useState(REPORT_REASONS[0].value);
  const [detail,    setDetail]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setStep("menu");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleDelete() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) { setOpen(false); onDeleted(); }
    else        { setError("No se pudo eliminar."); }
  }

  async function handleReport() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/posts/${postId}/report`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason, detail: detail.trim() || undefined }),
    });
    setLoading(false);
    if (res.ok)  { setStep("done"); }
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo enviar el reporte.");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen((v) => !v); setStep("menu"); setError(""); }}
        className="p-1.5 rounded-lg text-text-subtle hover:text-text hover:bg-bg transition-colors"
        title="Opciones"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-lg w-56 overflow-hidden">

          {/* ── Menu step ── */}
          {step === "menu" && (
            isOwner ? (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2   className="w-4 h-4" />
                }
                Eliminar publicación
              </button>
            ) : (
              <button
                onClick={() => setStep("report")}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg transition-colors"
              >
                <Flag className="w-4 h-4" />
                Reportar publicación
              </button>
            )
          )}

          {/* ── Report form step ── */}
          {step === "report" && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-text">¿Por qué reportás esto?</p>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-text">{r.label}</span>
                  </label>
                ))}
              </div>
              {reason === "other" && (
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Contanos más (opcional)"
                  maxLength={300}
                  rows={2}
                  className="w-full text-sm bg-bg border border-border rounded-xl px-3 py-2 resize-none text-text placeholder:text-text-subtle focus:outline-none focus:border-primary/40"
                />
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => { setStep("menu"); setError(""); }}
                  className="text-xs text-text-muted px-3 py-1.5 rounded-lg hover:bg-bg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReport}
                  disabled={loading}
                  className="text-xs font-medium bg-primary text-primary-fg px-3 py-1.5 rounded-lg hover:bg-primary-h disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Enviar reporte
                </button>
              </div>
            </div>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <div className="px-4 py-3 text-sm text-text-muted">
              ✓ Reporte enviado. Lo revisaremos pronto.
            </div>
          )}

          {error && step === "menu" && (
            <p className="px-4 pb-3 text-xs text-danger">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Comment section ───────────────────────────────────────────────────────────
function CommentSection({
  postId,
  currentUserId,
  isAuthenticated,
  initialCount,
}: {
  postId:        string;
  currentUserId: string | null;
  isAuthenticated: boolean;
  initialCount:  number;
}) {
  const [comments, setComments]   = useState<PostComment[]>([]);
  const [count, setCount]         = useState(initialCount);
  const [loaded, setLoaded]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res  = await fetch(`/api/posts/${postId}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al comentar"); return; }
      setComments((prev) => [...prev, data.comment]);
      setCount((c) => c + 1);
      setText("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ commentId }),
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCount((c) => Math.max(0, c - 1));
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="pt-2 border-t border-border-subtle space-y-3">
      {/* Load trigger */}
      {!loaded && (
        <button
          onClick={load}
          className="text-xs text-text-subtle hover:text-primary transition-colors"
        >
          {loading
            ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Cargando...</span>
            : count > 0
              ? `Ver ${count} comentario${count !== 1 ? "s" : ""}`
              : "Sin comentarios aún"
          }
        </button>
      )}

      {/* Comments list */}
      {loaded && (
        <div className="space-y-2.5">
          {comments.length === 0 && (
            <p className="text-xs text-text-subtle">Sin comentarios aún.</p>
          )}
          {comments.map((c) => {
            const authorHref = c.author.username ? `/${c.author.username}` : "#";
            const isOwn = c.author.id === currentUserId;
            return (
              <div key={c.id} className="flex gap-2.5 group">
                <Link href={authorHref} className="shrink-0">
                  {c.author.image ? (
                    <Image src={c.author.image} alt="" width={28} height={28} className="rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(c.author.name ?? "?")[0]}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0 bg-bg rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link href={authorHref} className="text-xs font-semibold text-text hover:text-primary transition-colors truncate">
                        {c.author.name ?? "Usuario"}
                      </Link>
                      <span className="text-[10px] text-text-subtle shrink-0">
                        {formatDate(new Date(c.createdAt))}
                      </span>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="shrink-0 text-text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-text mt-0.5 break-words">{c.content}</p>
                </div>
              </div>
            );
          })}

          {/* Input */}
          {isAuthenticated && (
            <div className="flex gap-2.5 pt-1">
              <div className="w-7 shrink-0" />
              <div className="flex-1 flex gap-2 items-end bg-bg rounded-xl border border-border px-3 py-2 focus-within:border-primary/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Escribí un comentario..."
                  rows={1}
                  maxLength={500}
                  className="flex-1 resize-none text-sm text-text placeholder:text-text-subtle focus:outline-none leading-relaxed"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="shrink-0 text-primary hover:text-primary-h disabled:opacity-30 transition-colors pb-0.5"
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          )}

          {error && <p className="pl-9 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({
  post,
  isAuthenticated = false,
  currentUserId   = null,
}: {
  post:             PostData;
  isAuthenticated?: boolean;
  currentUserId?:   string | null;
}) {
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [liked, setLiked]         = useState(post.likes.length > 0);
  const [liking, setLiking]       = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [deleted, setDeleted]     = useState(false);

  if (deleted) return null;

  async function toggleLike() {
    if (!isAuthenticated || liking) return;
    setLiking(true);
    setLiked((prev) => !prev);
    setLikeCount((prev) => liked ? prev - 1 : prev + 1);

    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        setLiked((prev) => !prev);
        setLikeCount(post._count.likes);
      }
    } finally {
      setLiking(false);
    }
  }

  const authorHref = post.author.username ? `/${post.author.username}` : "#";
  const badge      = post.tree ? CONTENT_TYPE_STYLE[post.tree.contentType] : null;

  return (
    <article className="space-y-5 rounded-[20px] border border-border bg-surface p-5 shadow-sm transition-[border-color,box-shadow] hover:border-primary/20 hover:shadow-md sm:p-6">

      {/* Header — author */}
      <div className="flex items-center gap-3.5">
        <Link href={authorHref} className="shrink-0">
          {post.author.image ? (
            <Image src={post.author.image} alt="" width={44} height={44} className="rounded-full" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {(post.author.name ?? "?")[0]}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={authorHref} className="text-[15px] font-bold text-text transition-colors hover:text-primary">
            {post.author.name ?? "Usuario"}
          </Link>
          <p className="mt-0.5 text-xs text-text-muted">
            {post.author.username ? `@${post.author.username} · ` : ""}{formatDate(new Date(post.createdAt))}
          </p>
        </div>
        {/* Options: delete (owner) or report (authenticated non-owner) */}
        {currentUserId && (
          <PostOptions
            postId={post.id}
            isOwner={post.author.id === currentUserId}
            onDeleted={() => setDeleted(true)}
          />
        )}
      </div>

      {/* Content */}
      <p className="whitespace-pre-wrap break-words text-[16px] leading-7 text-text">
        {post.content}
      </p>

      {/* Optional image */}
      {post.imageUrl && (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg">
          <Image
            src={post.imageUrl}
            alt="Imagen del post"
            width={600}
            height={400}
            className="max-h-[460px] w-full object-cover"
          />
        </div>
      )}

      {/* Attached tree card */}
      {post.tree && (
        <Link
          href={`/${post.tree.owner.username ?? ""}/${post.tree.slug}`}
          className={`group block rounded-2xl border border-l-4 border-border bg-gradient-to-r p-4 transition-colors ${badge?.gradientCls ?? ""} ${badge?.hoverBorderCls ?? ""}`}
          style={{ borderInlineStartColor: `var(--${post.tree.contentType.toLowerCase()})` }}
        >
          <div className="flex items-start gap-3">
            {badge && (
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badge.iconBgCls}`}>
                {badge.iconLg}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${badge.badgeCls}`}>
                    {badge.label}
                  </span>
                )}
                {post.tree.forkDepth > 0 && (
                  <span className="text-xs text-text-subtle flex items-center gap-1">
                    <GitFork className="w-3 h-3" /> Fork
                  </span>
                )}
              </div>
              <p className={`line-clamp-2 text-[15px] font-bold leading-snug text-text transition-colors ${badge?.groupHoverTextCls ?? "group-hover:text-primary"}`}>
                {post.tree.title}
              </p>
              {post.tree.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">{post.tree.description}</p>
              )}
              <p className="mt-2 text-xs text-text-subtle">
                por {post.tree.owner.name} · {post.tree._count.likes} me gusta · {post.tree._count.forks} forks
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-primary" />
          </div>
        </Link>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-3">
        <button
          onClick={toggleLike}
          disabled={!isAuthenticated}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
            liked
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-text-muted hover:bg-bg hover:text-primary"
          } disabled:cursor-default disabled:opacity-60`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span>Me gusta{likeCount > 0 ? ` · ${likeCount}` : ""}</span>
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
            showComments ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-primary"
          }`}
        >
          <MessageCircle className={`w-4 h-4 ${showComments ? "fill-primary/20" : ""}`} />
          <span>Comentar{post._count.comments > 0 ? ` · ${post._count.comments}` : ""}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          isAuthenticated={isAuthenticated}
          initialCount={post._count.comments}
        />
      )}
    </article>
  );
}
