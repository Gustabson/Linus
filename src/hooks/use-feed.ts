"use client";

import useSWR from "swr";
import type { PostData } from "@/components/social/PostCard";

// ── Hook para el feed de posts ─────────────────────────────────────────────
// Recibe los datos iniciales del servidor y los usa como fallback.
// SWR los actualiza en segundo plano y cachea para visitas posteriores.

export function useFeed(initialPosts: PostData[], tab: string) {
  const key = `/api/posts?tab=${tab}`;

  const { data, error, isLoading, mutate } = useSWR<{
    posts: PostData[];
    nextCursor: string | null;
  }>(key, {
    fallbackData: { posts: initialPosts, nextCursor: null },
    revalidateOnMount: true, // siempre refrescar al montar
  });

  return {
    posts: data?.posts ?? initialPosts,
    isLoading,
    isError: !!error,
    refresh: () => mutate(),
  };
}
