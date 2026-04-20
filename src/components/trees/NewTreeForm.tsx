"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

export function NewTreeForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    const res = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        language: data.get("language"),
        visibility: data.get("visibility"),
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/t/${json.slug}`);
    } else {
      setError(json.error ?? "Error al crear el currículo");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título del currículo *
        </label>
        <input
          name="title"
          required
          placeholder="Ej: Educación Primaria Argentina - Grado 3"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <textarea
          name="description"
          rows={3}
          placeholder="¿Para qué nivel? ¿Qué enfoque tiene? ¿En qué contexto?"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
          <select
            name="language"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
            <option value="fr">Francés</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
          <select
            name="visibility"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="PUBLIC">Público — todos pueden verlo</option>
            <option value="UNLISTED">No listado — solo con el link</option>
            <option value="PRIVATE">Privado — solo yo</option>
          </select>
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
        <BookOpen className="w-5 h-5" />
        {loading ? "Creando..." : "Crear currículo"}
      </button>
    </form>
  );
}
