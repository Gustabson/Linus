"use client";

import { useState } from "react";
import { GitFork } from "lucide-react";
import { useRouter } from "next/navigation";

export function ForkButton({
  treeId,
  treeTitle,
}: {
  treeId: string;
  treeTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFork() {
    setLoading(true);
    try {
      const res = await fetch("/api/trees/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });
      const data = await res.json();
      if (res.ok && data.slug) {
        router.push(`/t/${data.slug}`);
      } else {
        alert(data.error ?? "Error al forkear");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleFork}
      disabled={loading}
      className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <GitFork className="w-4 h-4" />
      {loading ? "Forkeando..." : `Fork "${treeTitle}"`}
    </button>
  );
}
