"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Heart, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { withoutLinkedTreeUrl, type SocialCommentData } from "@/lib/comments";
import { CommentAttachmentPreview } from "./CommentAttachmentPreview";
import { CommentComposer } from "./CommentComposer";
import { ShareButton } from "./ShareButton";
import { SharedTreeCard } from "./SharedTreeCard";

export function CommentItem({
  comment,
  postId,
  currentUserId,
  isAuthenticated,
  depth = 0,
  onDeleted,
  onThreadCountChange,
}: {
  comment: SocialCommentData;
  postId: string;
  currentUserId: string | null;
  isAuthenticated: boolean;
  depth?: number;
  onDeleted: (commentId: string) => void;
  onThreadCountChange: (delta: number) => void;
}) {
  const [liked, setLiked] = useState(comment.likes.length > 0);
  const [likeCount, setLikeCount] = useState(comment._count.likes);
  const [liking, setLiking] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count.replies);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<SocialCommentData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState("");

  const authorHref = comment.author.username ? `/${comment.author.username}` : "#";
  const isOwn = comment.author.id === currentUserId;
  const visibleText = comment.linkedTree
    ? withoutLinkedTreeUrl(comment.content, comment.linkedTree)
    : comment.content;
  const attachment = comment.attachmentUrl && comment.attachmentName && comment.attachmentType && comment.attachmentSize
    ? { url: comment.attachmentUrl, name: comment.attachmentName, type: comment.attachmentType, size: comment.attachmentSize }
    : null;

  async function toggleLike() {
    if (!isAuthenticated || liking) return;
    setLiking(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } finally {
      setLiking(false);
    }
  }

  async function deleteComment() {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id }),
    });
    if (response.ok) onDeleted(comment.id);
  }

  async function loadReplies(cursor?: string) {
    if (loadingReplies) return;
    setLoadingReplies(true);
    setReplyError("");
    try {
      const params = new URLSearchParams({ parentId: comment.id });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/posts/${postId}/comments?${params}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las respuestas");
      setReplies((previous) => cursor ? [...previous, ...(data.comments ?? [])] : (data.comments ?? []));
      setNextCursor(data.nextCursor ?? null);
      setShowReplies(true);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "No se pudieron cargar las respuestas");
    } finally {
      setLoadingReplies(false);
    }
  }

  return (
    <div id={`comment-${comment.id}`} className={depth > 0 ? "border-l-2 border-primary/15 pl-3" : ""}>
      <article className="group rounded-2xl border border-border-subtle bg-bg p-3">
        <div className="flex gap-2.5">
          <Link href={authorHref} className="shrink-0">
            {comment.author.image ? (
              <Image src={comment.author.image} alt="" width={32} height={32} className="rounded-full" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(comment.author.name ?? "?")[0]}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={authorHref} className="block truncate text-xs font-semibold text-text hover:text-primary">
                  {comment.author.name ?? "Usuario"}
                </Link>
                <Link href={`/post/${postId}?comment=${comment.id}`} className="text-[10px] text-text-subtle hover:text-primary">
                  {formatDate(new Date(comment.createdAt))}
                </Link>
              </div>
              {isOwn && (
                <button
                  type="button"
                  onClick={() => void deleteComment()}
                  className="p-1 text-text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  title="Eliminar comentario"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-2 space-y-2">
              {visibleText && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{visibleText}</p>}
              {comment.linkedTree && <SharedTreeCard tree={comment.linkedTree} compact />}
              {attachment && <CommentAttachmentPreview attachment={attachment} />}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-border-subtle pt-2 sm:justify-start">
              <button
                type="button"
                onClick={() => void toggleLike()}
                disabled={!isAuthenticated || liking}
                aria-label={liked ? "Quitar Me gusta del comentario" : "Me gusta el comentario"}
                className={`flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2 ${liked ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface hover:text-primary"} disabled:opacity-60`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">Me gusta</span>{likeCount > 0 ? <span>{likeCount}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => setShowReplyComposer((value) => !value)}
                disabled={!isAuthenticated}
                aria-label="Responder comentario"
                className="flex min-h-8 items-center gap-1.5 rounded-lg px-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface hover:text-primary disabled:opacity-60 sm:px-2"
              >
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Responder</span>
              </button>
              <ShareButton
                path={`/post/${postId}?comment=${comment.id}`}
                compactOnMobile
                className="flex min-h-8 items-center gap-1.5 rounded-lg px-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface hover:text-primary sm:px-2"
              />
            </div>
          </div>
        </div>

        {showReplyComposer && (
          <div className="mt-3 border-t border-border-subtle pt-2">
            <CommentComposer
              postId={postId}
              parentId={comment.id}
              placeholder={`Respondé a ${comment.author.name ?? "este comentario"}…`}
              onCreated={(reply) => {
                setReplies((previous) => [reply, ...previous]);
                setReplyCount((count) => count + 1);
                setShowReplies(true);
                setShowReplyComposer(false);
                onThreadCountChange(1);
              }}
            />
          </div>
        )}
      </article>

      {replyCount > 0 && !showReplies && (
        <button
          type="button"
          onClick={() => void loadReplies()}
          disabled={loadingReplies}
          className="ml-10 mt-1.5 flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-primary hover:underline"
        >
          {loadingReplies ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Ver {replyCount} respuesta{replyCount === 1 ? "" : "s"}
        </button>
      )}

      {showReplies && (
        <div className="ml-4 mt-2 space-y-2">
          <button type="button" onClick={() => setShowReplies(false)} className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-primary">
            <ChevronUp className="h-3 w-3" /> Ocultar respuestas
          </button>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              depth={Math.min(depth + 1, 3)}
              onDeleted={(replyId) => {
                setReplies((previous) => previous.filter((item) => item.id !== replyId));
                setReplyCount((count) => Math.max(0, count - 1));
                onThreadCountChange(-1);
              }}
              onThreadCountChange={onThreadCountChange}
            />
          ))}
          {nextCursor && (
            <button type="button" onClick={() => void loadReplies(nextCursor)} disabled={loadingReplies} className="ml-6 text-xs font-semibold text-primary hover:underline">
              {loadingReplies ? "Cargando…" : "Cargar más respuestas"}
            </button>
          )}
        </div>
      )}
      {replyError && <p className="ml-10 mt-1 text-xs text-danger">{replyError}</p>}
    </div>
  );
}
