"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, GitFork, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_BADGE } from "@/lib/constants";
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
  likes:      { id: string }[];  // current user's like, empty if not liked
  isAuthenticated?: boolean;
}

export function PostCard({ post, isAuthenticated = false }: { post: PostData; isAuthenticated?: boolean }) {
  const [likeCount, setLikeCount]   = useState(post._count.likes);
  const [liked, setLiked]           = useState(post.likes.length > 0);
  const [liking, setLiking]         = useState(false);

  async function toggleLike() {
    if (!isAuthenticated || liking) return;
    setLiking(true);
    // Optimistic update
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);

    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        // Revert on error
        setLiked(prev => !prev);
        setLikeCount(post._count.likes);
      }
    } finally {
      setLiking(false);
    }
  }

  const authorHref = post.author.username ? `/${post.author.username}` : "#";
  const badge      = post.tree ? CONTENT_TYPE_BADGE[post.tree.contentType] : null;

  return (
    <article className="bg-surface rounded-2xl border border-border hover:border-gray-300 transition-colors p-5 space-y-4">
      {/* Header — author */}
      <div className="flex items-center gap-3">
        <Link href={authorHref} className="shrink-0">
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
              {(post.author.name ?? "?")[0]}
            </div>
          )}
        </Link>
        <div className="min-w-0">
          <Link href={authorHref} className="text-sm font-semibold text-text hover:text-green-700 transition-colors">
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
          className="block border border-border rounded-xl p-4 hover:border-green-200 hover:bg-green-50/40 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-green-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${badge.cls}`}>
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
              <p className="text-sm font-semibold text-text group-hover:text-green-700 transition-colors leading-snug line-clamp-1">
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

        <span className="flex items-center gap-1.5 text-sm text-text-subtle">
          <MessageCircle className="w-4 h-4" />
          <span>{post._count.comments}</span>
        </span>
      </div>
    </article>
  );
}
