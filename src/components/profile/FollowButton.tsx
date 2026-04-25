"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";

export function FollowButton({
  userId,
  initialFollowing,
  initialCount,
  isAuthenticated,
  compact = false,
}: {
  userId: string;
  initialFollowing: boolean;
  initialCount: number;
  isAuthenticated: boolean;
  /** Compact mode: icon-only button, no counter. Used in sidebar lists. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isAuthenticated) { router.push("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setCount(data.count);
      }
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={following ? "Dejar de seguir" : "Seguir"}
        className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full transition-all disabled:opacity-60 shrink-0 ${
          following
            ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
            : "bg-green-100 text-green-700 hover:bg-green-200"
        }`}
      >
        {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60 ${
        following
          ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200"
          : "bg-green-700 text-white hover:bg-green-800"
      }`}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {following ? "Siguiendo" : "Seguir"}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        following ? "bg-gray-200 text-gray-600" : "bg-green-600 text-green-100"
      }`}>
        {count}
      </span>
    </button>
  );
}
