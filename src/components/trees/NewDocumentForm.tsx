"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { CONTENT_TYPE_STYLE, KERNEL_DOC_PLACEHOLDER, KERNEL_NEW_DOC_LABEL } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

interface Props {
  treeSlug:      string;
  ownerUsername: string;
  contentType?:  ContentType;
}

export function NewDocumentForm({ treeSlug, ownerUsername, contentType = "KERNEL" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const router = useRouter();

  const style = CONTENT_TYPE_STYLE[contentType];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    const res = await fetch(`/api/trees/${treeSlug}/documents`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: data.get("title") }),
    });

    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/${ownerUsername}/${treeSlug}/${json.slug}`);
    } else {
      setError(json.error ?? "Error al crear el documento");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título *
          </label>
          <input
            name="title"
            required
            placeholder={KERNEL_DOC_PLACEHOLDER}
            className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${style.ringCls}`}
          />
        </div>
        <p className="text-xs text-gray-400">
          El documento empieza vacío — vos elegís el nombre y la cantidad de secciones.
        </p>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${style.btnCls}`}
      >
        <FileText className="w-5 h-5" />
        {loading ? "Creando..." : KERNEL_NEW_DOC_LABEL}
      </button>
    </form>
  );
}
