"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PostComposer } from "./PostComposer";
import { PostCard, type PostData } from "./PostCard";
import { Loader2, RefreshCw, ArrowUp } from "lucide-react";

const POLL_MS = 30_000; // 30 s

interface Props {
  initialPosts:    PostData[];
  initialCursor:   string | null;
  tab:             string;
  currentUser: {
    id:       string;
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
}

export function PostFeed({ initialPosts, initialCursor, tab, currentUser }: Props) {
  const [posts, setPosts]         = useState<PostData[]>(initialPosts);
  const [cursor, setCursor]       = useState<string | null>(initialCursor);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(!!initialCursor);

  // Real-time new-posts queue
  const [newQueue, setNewQueue]   = useState<PostData[]>([]);

  // Track the createdAt of the newest visible post for polling
  const newestDateRef = useRef<string | null>(
    initialPosts.length > 0 ? initialPosts[0].createdAt : null
  );

  // ── Polling ────────────────────────────────────────────────────────────────
  const pollNew = useCallback(async () => {
    if (!newestDateRef.current) return;
    try {
      const params = new URLSearchParams({ tab, since: newestDateRef.current });
      const res  = await fetch(`/api/posts?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.posts?.length > 0) {
        setNewQueue((prev) => {
          // Deduplicate against already queued ids
          const existingIds = new Set(prev.map((p: PostData) => p.id));
          const fresh = (data.posts as PostData[]).filter((p) => !existingIds.has(p.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
      }
    } catch {
      // ignore network errors
    }
  }, [tab]);

  useEffect(() => {
    const id = setInterval(pollNew, POLL_MS);
    function onVisible() { if (document.visibilityState === "visible") pollNew(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [pollNew]);

  // ── Show queued posts ──────────────────────────────────────────────────────
  function flushQueue() {
    if (newQueue.length === 0) return;
    // Prepend (deduplicated against current feed)
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
    // Clear any queued posts that might duplicate this one
    setNewQueue((prev) => prev.filter((p) => p.id !== post.id));
  }

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, tab]);

  return (
    <div className="space-y-4">
      {/* Composer always at top */}
      <PostComposer currentUser={currentUser} onPostCreated={handlePostCreated} />

      {/* ── "Ver N nuevas publicaciones" banner ─────────────────────────── */}
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
        <div className="bg-surface rounded-2xl border-2 border-dashed border-border p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-gray-200" />
          <p className="text-text-muted font-medium">
            {tab === "siguiendo"
              ? "Seguí a otras personas para ver sus publicaciones acá."
              : "Todavía no hay publicaciones. ¡Sé el primero!"}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAuthenticated={true}
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
