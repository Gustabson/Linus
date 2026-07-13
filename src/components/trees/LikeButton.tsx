"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useAppRouter";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function LikeButton({
  treeSlug,
  initialLiked,
  initialCount,
  isAuthenticated,
  compact = false,
}: {
  treeSlug: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) { router.push("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount(data.count);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={liked}
      aria-label={liked ? `Quitar Me gusta. ${count} Me gusta` : `Dar Me gusta. ${count} Me gusta`}
      className={cn(
        "relative z-20 flex items-center border text-sm transition-all disabled:opacity-50",
        compact ? "gap-1.5 rounded-lg border-transparent px-2 py-1.5" : "gap-2 rounded-lg px-4 py-2",
        liked
          ? "border-danger/20 bg-danger/10 text-danger hover:bg-danger/15"
          : compact
            ? "text-text-subtle hover:bg-bg hover:text-danger"
            : "border-border text-text-muted hover:bg-bg"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span>{count}</span>
    </button>
  );
}
