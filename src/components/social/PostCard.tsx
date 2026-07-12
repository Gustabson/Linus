"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Loader2, Trash2, MoreHorizontal, Flag } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { COMMENT_PAGE_SIZE, withoutLinkedTreeUrl, type SharedTreeData, type SocialCommentData } from "@/lib/comments";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { ShareButton } from "./ShareButton";
import { SharedTreeCard } from "./SharedTreeCard";

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
  tree: SharedTreeData | null;
  _count:     { likes: number; comments: number };
  likes:      { id: string }[];
  isAuthenticated?: boolean;
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
  totalComments,
  focusedCommentId,
  onCountChange,
}: {
  postId:        string;
  currentUserId: string | null;
  isAuthenticated: boolean;
  totalComments: number;
  focusedCommentId?: string | null;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<SocialCommentData[]>([]);
  const [total, setTotal] = useState(totalComments);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadFirstPage() {
      setLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams();
        if (focusedCommentId) params.set("focusId", focusedCommentId);
        const response = await fetch(`/api/posts/${postId}/comments${params.size ? `?${params}` : ""}`, { signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los comentarios");
        setComments(data.comments ?? []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setNextCursor(data.nextCursor ?? null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los comentarios");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadFirstPage();
    return () => controller.abort();
  }, [postId, focusedCommentId, retryKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar más comentarios");
      setComments((previous) => {
        const knownIds = new Set(previous.map((comment) => comment.id));
        return [...previous, ...(data.comments ?? []).filter((comment: SocialCommentData) => !knownIds.has(comment.id))];
      });
      setTotal((current) => typeof data.total === "number" ? data.total : current);
      setNextCursor(data.nextCursor ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar más comentarios");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleDeleted(commentId: string) {
    setComments((previous) => previous.filter((comment) => comment.id !== commentId));
    setTotal((count) => Math.max(0, count - 1));
    onCountChange(-1);
  }

  return (
    <div className="space-y-3 border-t border-border-subtle pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-text">
          Comentarios <span className="font-normal text-text-subtle">· {total}</span>
        </p>
      </div>

      {isAuthenticated && !focusedCommentId && (
        <CommentComposer
          postId={postId}
          onCreated={(comment) => {
            setComments((previous) => [comment, ...previous]);
            setTotal((count) => count + 1);
            onCountChange(1);
          }}
        />
      )}

      {loading && (
        <p className="flex items-center gap-1.5 text-xs text-text-subtle">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando comentarios…
        </p>
      )}

      {!loading && loadError && comments.length === 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2">
          <p className="text-xs text-danger">{loadError}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="shrink-0 text-xs font-semibold text-danger hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-2.5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              initialRepliesOpen={focusedCommentId === comment.id}
              initialReplyComposerOpen={focusedCommentId === comment.id && isAuthenticated}
              onDeleted={handleDeleted}
              onThreadCountChange={onCountChange}
            />
          ))}
        </div>
      )}

      {comments.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <p className="text-[11px] text-text-subtle">Mostrando {comments.length} de {total} comentarios</p>
          {nextCursor && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="flex min-h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Cargar {Math.min(COMMENT_PAGE_SIZE, Math.max(1, total - comments.length))} más
            </button>
          )}
        </div>
      )}

      {!loading && loadError && comments.length > 0 && (
        <p className="text-right text-xs text-danger">{loadError}</p>
      )}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({
  post,
  isAuthenticated = false,
  currentUserId   = null,
  initialCommentsOpen = false,
  focusedCommentId = null,
}: {
  post:             PostData;
  isAuthenticated?: boolean;
  currentUserId?:   string | null;
  initialCommentsOpen?: boolean;
  focusedCommentId?: string | null;
}) {
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [liked, setLiked]         = useState(post.likes.length > 0);
  const [liking, setLiking]       = useState(false);
  const [likeError, setLikeError] = useState("");
  const [showComments, setShowComments] = useState(initialCommentsOpen);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [deleted, setDeleted]     = useState(false);

  if (deleted) return null;

  async function toggleLike() {
    if (!isAuthenticated || liking) return;
    setLiking(true);
    setLikeError("");

    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        setLikeError(data.error ?? "No se pudo actualizar el Me gusta");
      }
    } catch {
      setLikeError("No se pudo conectar. Intentá nuevamente.");
    } finally {
      setLiking(false);
    }
  }

  const authorHref = post.author.username ? `/${post.author.username}` : "#";
  const visiblePostContent = post.tree
    ? withoutLinkedTreeUrl(post.content, post.tree)
    : post.content;

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
      {visiblePostContent && (
        <p className="whitespace-pre-wrap break-words text-[16px] leading-7 text-text">
          {visiblePostContent}
        </p>
      )}

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
      {post.tree && <SharedTreeCard tree={post.tree} />}

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
        <button
          onClick={toggleLike}
          disabled={!isAuthenticated || liking}
          aria-label={liked ? "Quitar Me gusta" : "Me gusta"}
          className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
            liked
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-text-muted hover:bg-bg hover:text-primary"
          } disabled:cursor-default disabled:opacity-60`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span className="hidden sm:inline">Me gusta</span>{likeCount > 0 && <span>{likeCount}</span>}
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          aria-label={showComments ? "Ocultar comentarios" : "Abrir comentarios"}
          className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
            showComments ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-primary"
          }`}
        >
          <MessageCircle className={`w-4 h-4 ${showComments ? "fill-primary/20" : ""}`} />
          <span className="hidden sm:inline">Comentar</span>{commentCount > 0 && <span>{commentCount}</span>}
        </button>

        <ShareButton
          path={`/post/${post.id}`}
          compactOnMobile
          className="flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold text-text-muted transition-colors hover:bg-bg hover:text-primary sm:gap-2 sm:px-3 sm:text-sm"
        />
      </div>
      {likeError && <p role="alert" className="-mt-3 text-center text-xs text-danger">{likeError}</p>}

      {/* Comments section */}
      {showComments && (
        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          isAuthenticated={isAuthenticated}
          totalComments={commentCount}
          focusedCommentId={focusedCommentId}
          onCountChange={(delta) => setCommentCount((count) => Math.max(0, count + delta))}
        />
      )}
    </article>
  );
}
