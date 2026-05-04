"use client";

import useSWR from "swr";

// ── Hook para los trees del usuario (dashboard) ────────────────────────────
// Cachea en memoria — al volver al dashboard, los datos aparecen al instante.

interface TreeItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentType: string;
  visibility: string;
  forkDepth: number;
  updatedAt: string;
  parentTree: { slug: string; title: string; contentType: string } | null;
  _count: { forks: number; likes: number; documents: number };
}

export function useUserTrees(initialTrees: TreeItem[], tab: string) {
  const key = `/api/users/kernels?tab=${tab}`;

  const { data, error, mutate } = useSWR<TreeItem[]>(key, {
    fallbackData: initialTrees,
    revalidateOnMount: true,
  });

  return {
    trees: data ?? initialTrees,
    isError: !!error,
    refresh: () => mutate(),
  };
}
