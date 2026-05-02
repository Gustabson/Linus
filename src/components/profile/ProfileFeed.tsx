"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostData } from "@/components/social/PostCard";
import { Loader2, Pencil, ArrowUp } from "lucide-react";

const POLL_MS = 30_000; // 30 s

interface CurrentUser {
  id:       string;
  name:     string | null;
  username: string | null;
  image:    string | null;
}

interface Props {
  username:      string;          // whose profile this is
  initialPosts:  PostData[];
  initialCursor: string | null;
  currentUser:   CurrentUser | null;  // null = visitor not logged in
  isOwnProfile:  boolean;
}

export function ProfileFeed({
  username,
  initialPosts,
  initialCursor,
  currentUser,
  isOwnProfile,
}: Props) {
  const [posts, setPosts]     = useState<PostData[]>(initialPosts);
  const [cursor, setCursor]   = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);

  // Real-time new-posts queue
  const [newQueue, setNewQueue] = useState<PostData[]>([]);

  // Track newest visible post date for polling
  const newestDateRef = useRef<string | null>(
    initialPosts.length > 0 ? initialPosts[0].createdAt : null
  );

  // ── Polling ────────────────────────────────────────────────────────────────
  const pollNew = useCallback(async () => {
    if (!newestDateRef.current) return;
    try {
      const params = new URLSearchParams({ username, since: newestDateRef.current });
      const res  = await fetch(`/api/posts?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.posts?.length > 0) {
        setNewQueue((prev) => {
          const existingIds = new Set(prev.map((p: PostData) => p.id));
          const fresh = (data.posts as PostData[]).filter((p) => !existingIds.has(p.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
      }
    } catch {
      // ignore
    }
  }, [username]);

  useEffect(() => {
    const id = setInterval(pollNew, POLL_MS);
    function onVisible() { if (document.visibilityState === "visible") pollNew(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [pollNew]);

  // ── Show queued posts ──────────────────────────────────────────────────────
  function flushQueue() {
    if (newQueue.length === 0) return;
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = newQueue.filter((p) => !existingIds.has(p.id));
      const merged = [...toAdd, ...prev];
      if (merged.length > 0) newestDateRef.current = merged[0].createdAt;
      return merged;
    });
    setNewQueue([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Composer callback ──────────────────────────────────────────────────────
  function handlePostCreated(post: PostData) {
    const withLikes = { ...post, likes: [] };
    setPosts((prev) => {
      const merged = [withLikes, ...prev];
      newestDateRef.current = merged[0].createdAt;
      return merged;
    });
    setNewQueue((prev) => prev.filter((p) => p.id !== post.id));
  }

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ username });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, username]);

  const isAuthenticated = !!currentUser;

  return (
    <div className="space-y-4">
      {/* Composer — only own profile and logged in */}
      {isOwnProfile && currentUser && (
        <PostComposer currentUser={currentUser} onPostCreated={handlePostCreated} />
      )}

      {/* ── "Ver N nuevas publicaciones" banner ─────────────────────── */}
      {newQueue.length > 0 && (
        <button
          onClick={flushQueue}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-fg text-sm font-semibold shadow-md hover:bg-primary-h transition-colors animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <ArrowUp className="w-4 h-4" />
          Ver {newQueue.length} publicación{newQueue.length !== 1 ? "es" : ""} nueva{newQueue.length !== 1 ? "s" : ""}
        </button>
      )}

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-border-subtle flex items-center justify-center">
            <Pencil className="w-5 h-5 text-text-subtle" />
          </div>
          <p className="text-text-muted font-medium text-sm">
            {isOwnProfile
              ? "Todavía no publicaste nada. ¡Compartí algo con la comunidad!"
              : "Este usuario todavía no tiene publicaciones."}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUser?.id ?? null}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-3 text-sm text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
                : "Ver más publicaciones"
              }
            </button>
          )}
        </>
      )}
    </div>
  );
}
