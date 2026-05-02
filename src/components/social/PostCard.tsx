"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, GitFork, BookOpen, Send, Loader2, Trash2 } from "lucide-react";
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-subtle hover:text-red-500 shrink-0"
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

          {error && <p className="text-xs text-red-500 pl-9">{error}</p>}
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
    <article className="bg-surface rounded-2xl border border-border hover:border-gray-300 transition-colors p-5 space-y-4">

      {/* Header — author */}
      <div className="flex items-center gap-3">
        <Link href={authorHref} className="shrink-0">
          {post.author.image ? (
            <Image src={post.author.image} alt="" width={40} height={40} className="rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(post.author.name ?? "?")[0]}
            </div>
          )}
        </Link>
        <div className="min-w-0">
          <Link href={authorHref} className="text-sm font-semibold text-text hover:text-primary transition-colors">
            {post.author.name ?? "Usuario"}
          </Link>
          <p className="text-xs text-text-subtle">
            {post.author.username ? `@${post.author.username} · ` : ""}{formatDate(new Date(post.createdAt))}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-text text-[15px] leading-relaxed whitespace-pre-wrap break-words">
        {post.content}
      </p>

      {/* Optional image */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-border-subtle">
          <Image
            src={post.imageUrl}
            alt="Imagen del post"
            width={600}
            height={400}
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Attached tree card */}
      {post.tree && (
        <Link
          href={`/${post.tree.owner.username ?? ""}/${post.tree.slug}`}
          className="block border border-border rounded-xl p-4 hover:border-primary/20 hover:bg-primary/5/40 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${badge.badgeCls}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                )}
                {post.tree.forkDepth > 0 && (
                  <span className="text-xs text-text-subtle flex items-center gap-1">
                    <GitFork className="w-3 h-3" /> Fork
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors leading-snug line-clamp-1">
                {post.tree.title}
              </p>
              {post.tree.description && (
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{post.tree.description}</p>
              )}
              <p className="text-xs text-text-subtle mt-1">
                por {post.tree.owner.name} · {post.tree._count.likes} me gusta · {post.tree._count.forks} forks
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 pt-1 border-t border-border-subtle">
        <button
          onClick={toggleLike}
          disabled={!isAuthenticated}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked
              ? "text-red-500 hover:text-red-600"
              : "text-text-subtle hover:text-red-400"
          } disabled:cursor-default`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span>{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            showComments ? "text-primary" : "text-text-subtle hover:text-primary"
          }`}
        >
          <MessageCircle className={`w-4 h-4 ${showComments ? "fill-primary/20" : ""}`} />
          <span>{post._count.comments}</span>
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
