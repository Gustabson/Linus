"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { SECTION_LABELS, SECTION_ORDER } from "@/lib/utils";

export function NewDocumentForm({
  treeSlug,
  treeId,
}: {
  treeSlug: string;
  treeId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    const res = await fetch(`/api/trees/${treeSlug}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        treeId,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/t/${treeSlug}/${json.slug}`);
    } else {
      setError(json.error ?? "Error al crear el documento");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título del documento *
          </label>
          <input
            name="title"
            required
            placeholder="Ej: Matemáticas — Grado 3 — Fracciones"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Se crearán estas 10 secciones (las completás después):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SECTION_ORDER.map((type) => (
              <span
                key={type}
                className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg"
              >
                {SECTION_LABELS[type]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FileText className="w-5 h-5" />
        {loading ? "Creando..." : "Crear documento"}
      </button>
    </form>
  );
}
