"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function LikeButton({
  treeSlug,
  initialLiked,
  initialCount,
  isAuthenticated,
}: {
  treeSlug: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/trees/${treeSlug}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 border text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-50",
        liked
          ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      )}
    >
      <Heart className={cn("w-4 h-4", liked && "fill-red-500 text-red-500")} />
      <span>{count}</span>
    </button>
  );
}
