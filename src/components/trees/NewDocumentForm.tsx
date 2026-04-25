"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

export function NewDocumentForm({ treeSlug }: { treeSlug: string }) {
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
      body: JSON.stringify({ title: data.get("title") }),
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
        <p className="text-xs text-gray-400">
          El documento se crea vacío. Vas a agregar las secciones vos mismo con los nombres que quieras.
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
        className="w-full bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FileText className="w-5 h-5" />
        {loading ? "Creando..." : "Crear documento"}
      </button>
    </form>
  );
}
