"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteTreeButton({
  slug,
  title,
  hasForks,
}: {
  slug: string;
  title: string;
  hasForks: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/trees/${slug}/settings`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="relative z-10 flex items-center gap-1">
        <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={hasForks
        ? `Eliminar "${title}" (los forks existentes se mantienen intactos)`
        : `Eliminar "${title}"`}
      className="relative z-10 flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Eliminar
    </button>
  );
}
