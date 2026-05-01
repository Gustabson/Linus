"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BookOpen } from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { ContentType } from "@prisma/client";

const CONTENT_TYPES: { value: ContentType; desc: string }[] = [
  {
    value: "KERNEL",
    desc: "El currículo base de tu escuela o institución. Cualquiera puede forkearlo y adaptarlo.",
  },
  {
    value: "MODULE",
    desc: "Una unidad didáctica independiente con sus propias secciones. Se puede adjuntar a cualquier kernel.",
  },
  {
    value: "RESOURCE",
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
  const { data: session } = useSession();

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

    const ownerUsername = session?.user?.username ?? session?.user?.name ?? "";

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
        router.push(`/${ownerUsername}/${json.slug}/${doc.slug}`);
        return;
      }
    }

    // Kernels go to the tree overview page
    router.push(`/${ownerUsername}/${json.slug}`);
  }

  const selectedStyle = CONTENT_TYPE_STYLE[contentType];
  const selectedMeta  = CONTENT_TYPES.find((t) => t.value === contentType)!;

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-6 space-y-5">
      {/* Type selector — hidden when type is locked from context */}
      {lockType ? (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${selectedStyle.borderCls} ${selectedStyle.lightBgCls}`}>
          <div className={`p-1.5 rounded-lg shrink-0 ${selectedStyle.iconBgCls}`}>
            {selectedStyle.iconLg}
          </div>
          <div>
            <p className="text-sm font-medium text-text">{selectedStyle.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{selectedMeta.desc}</p>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-text mb-2">Tipo de contenido</label>
          <div className="space-y-2">
            {CONTENT_TYPES.map((t) => {
              const ts      = CONTENT_TYPE_STYLE[t.value];
              const isActive = contentType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setContentType(t.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? `${ts.accentBorderCls} ${ts.lightBgCls}`
                      : "border-border hover:border-gray-300"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? ts.iconBgCls : "bg-border-subtle text-text-muted"}`}>
                    {ts.iconLg}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{ts.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 ${isActive ? `${ts.accentBorderCls} ${ts.progressCls}` : "border-gray-300"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Título *</label>
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
          className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${selectedStyle.ringCls}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">Descripción (opcional)</label>
        <textarea name="description" rows={3}
          placeholder="¿Para qué nivel? ¿Qué enfoque tiene? ¿En qué contexto?"
          className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${selectedStyle.ringCls} resize-none`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Idioma</label>
          <select name="language" className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${selectedStyle.ringCls}`}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
            <option value="fr">Francés</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Visibilidad</label>
          <select name="visibility" className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${selectedStyle.ringCls}`}>
            <option value="PUBLIC">Público</option>
            <option value="UNLISTED">No listado</option>
            <option value="PRIVATE">Privado</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>}

      <button type="submit" disabled={loading}
        className={`w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${selectedStyle.btnCls}`}>
        <BookOpen className="w-5 h-5" />
        {loading
          ? (kernelSlug ? "Creando y adjuntando..." : "Creando...")
          : `Crear ${selectedStyle.label}`}
      </button>
    </form>
  );
}
