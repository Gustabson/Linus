"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Cpu, Puzzle, Package } from "lucide-react";

const CONTENT_TYPES = [
  {
    value: "KERNEL",
    label: "Kernel",
    icon: <Cpu className="w-5 h-5" />,
    desc: "El currículo base de tu escuela o institución. Otros maestros lo pueden forkear y adaptar.",
  },
  {
    value: "MODULE",
    label: "Módulo",
    icon: <Puzzle className="w-5 h-5" />,
    desc: "Una unidad didáctica independiente con sus propias secciones. Se puede adjuntar a cualquier kernel.",
  },
  {
    value: "RESOURCE",
    label: "Recurso",
    icon: <Package className="w-5 h-5" />,
    desc: "Material de apoyo, guía o herramienta educativa. Se puede adjuntar a cualquier kernel.",
  },
];

export function NewTreeForm({
  defaultType = "KERNEL",
  lockType = false,
  kernelSlug,
}: {
  defaultType?: "KERNEL" | "MODULE" | "RESOURCE";
  lockType?: boolean;
  kernelSlug?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contentType, setContentType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    // 1. Create the tree
    const res = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        language: data.get("language"),
        visibility: data.get("visibility"),
        contentType,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al crear");
      setLoading(false);
      return;
    }

    // 2. If coming from a kernel, auto-attach
    if (kernelSlug && (contentType === "MODULE" || contentType === "RESOURCE")) {
      await fetch(`/api/trees/${kernelSlug}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: json.id }),
      });
    }

    // 3. Modules and resources always go directly to the document editor.
    //    Create the first document automatically using the same title.
    if (contentType === "MODULE" || contentType === "RESOURCE") {
      const docRes = await fetch(`/api/trees/${json.slug}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || String(data.get("title")), treeId: json.id }),
      });
      if (docRes.ok) {
        const doc = await docRes.json();
        router.push(`/t/${json.slug}/${doc.slug}`);
        return;
      }
    }

    // Kernels go to the tree overview page
    router.push(`/t/${json.slug}`);
  }

  const selected = CONTENT_TYPES.find((t) => t.value === contentType)!;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      {/* Type selector — hidden when type is locked from context */}
      {lockType ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
          <div className="p-1.5 rounded-lg bg-green-100 text-green-700 shrink-0">
            {selected.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{selected.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selected.desc}</p>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de contenido</label>
          <div className="space-y-2">
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setContentType(t.value as "KERNEL" | "MODULE" | "RESOURCE")}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  contentType === t.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${contentType === t.value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {t.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 ${contentType === t.value ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            contentType === "KERNEL"   ? "Ej: Educación Primaria Argentina - Grado 3" :
            contentType === "MODULE"   ? "Ej: Unidad de Fracciones - 4to grado" :
                                         "Ej: Guía de actividades de lectura"
          }
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
        <textarea name="description" rows={3}
          placeholder="¿Para qué nivel? ¿Qué enfoque tiene? ¿En qué contexto?"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
          <select name="language" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
            <option value="fr">Francés</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
          <select name="visibility" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="PUBLIC">Público</option>
            <option value="UNLISTED">No listado</option>
            <option value="PRIVATE">Privado</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>}

      <button type="submit" disabled={loading}
        className="w-full bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        <BookOpen className="w-5 h-5" />
        {loading
          ? (kernelSlug ? "Creando y adjuntando..." : "Creando...")
          : `Crear ${selected.label}`}
      </button>
    </form>
  );
}
