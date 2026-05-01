"use client";

import { useState, useCallback } from "react";
import { PostComposer } from "./PostComposer";
import { PostCard, type PostData } from "./PostCard";
import { Loader2, RefreshCw } from "lucide-react";

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

  function handlePostCreated(post: PostData) {
    // Inject current user's like array so PostCard knows it's not liked yet
    setPosts(prev => [{ ...post, likes: [] }, ...prev]);
  }

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`/api/posts?${params}`);
      const data = await res.json();

      setPosts(prev => [...prev, ...data.posts]);
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
