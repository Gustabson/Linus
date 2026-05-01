"use client";

import { useState, useCallback } from "react";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostData } from "@/components/social/PostCard";
import { Loader2, Pencil } from "lucide-react";

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

  function handlePostCreated(post: PostData) {
    setPosts(prev => [{ ...post, likes: [] }, ...prev]);
  }

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ username });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts(prev => [...prev, ...data.posts]);
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
