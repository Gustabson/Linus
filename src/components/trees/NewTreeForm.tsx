"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/hooks/useAppRouter";
import { useSession } from "next-auth/react";
import { BookOpen, Loader2, Upload } from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { ContentType, ResourceKind } from "@prisma/client";

const RESOURCE_KIND_OPTIONS: Array<{ value: ResourceKind; label: string }> = [
  { value: "EDITOR", label: "Editor de texto" },
  { value: "LINK", label: "Enlace" },
  { value: "APP", label: "App" },
  { value: "VIDEO", label: "Video" },
  { value: "IMAGE", label: "Imagen" },
  { value: "FILE", label: "Archivo" },
  { value: "REFERENCE", label: "Referencia" },
];

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
    desc: "Editor, enlace, app, video, archivo o referencia. Se puede adjuntar a kernels y módulos.",
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
  const [resourceKind, setResourceKind] = useState<ResourceKind>("EDITOR");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
    const data = new FormData(e.currentTarget);

    let resolvedResourceUrl = resourceUrl.trim();
    if (contentType === "RESOURCE" && resourceKind !== "EDITOR" && resourceFile) {
      setUploading(true);
      const uploadBody = new FormData();
      uploadBody.append("file", resourceFile);
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: uploadBody });
      const upload = await uploadResponse.json().catch(() => ({}));
      setUploading(false);
      if (!uploadResponse.ok) {
        setError(upload.error ?? "No se pudo subir el archivo");
        setLoading(false);
        return;
      }
      resolvedResourceUrl = upload.url;
    }
    if (contentType === "RESOURCE" && resourceKind !== "EDITOR" && resourceKind !== "REFERENCE" && !resolvedResourceUrl) {
      setError("Elegí un archivo o agregá una URL");
      setLoading(false);
      return;
    }

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
        resourceKind: contentType === "RESOURCE" ? resourceKind : null,
        resourceUrl: contentType === "RESOURCE" && resourceKind !== "EDITOR" ? resolvedResourceUrl : null,
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
    if (contentType === "MODULE" || (contentType === "RESOURCE" && resourceKind === "EDITOR")) {
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

    // Kernels and external resources go to their overview page.
    router.push(`/${ownerUsername}/${json.slug}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el contenido");
    } finally {
      setUploading(false);
      setLoading(false);
    }
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
                  onClick={() => { setContentType(t.value); if (t.value !== "RESOURCE") { setResourceKind("EDITOR"); setResourceUrl(""); setResourceFile(null); } }}
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

      {contentType === "RESOURCE" && (
        <div className="space-y-3 rounded-xl border border-resource/20 bg-resource/5 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Formato del recurso</label>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_KIND_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => { setResourceKind(option.value); setResourceFile(null); setResourceUrl(""); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${resourceKind === option.value ? "border-resource/40 bg-surface text-resource" : "border-border bg-surface text-text-muted"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {resourceKind !== "EDITOR" && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border bg-surface p-4 text-center hover:border-resource/40">
                <Upload className="mx-auto mb-1 h-5 w-5 text-text-subtle" />
                <span className="block text-sm font-semibold text-text">{resourceFile ? resourceFile.name : "Seleccionar archivo"}</span>
                <span className="text-xs text-text-subtle">Máximo 10 MB · sin ejecutables ni comprimidos</span>
              </button>
              <input ref={fileRef} type="file" hidden accept="image/*,video/*,.pdf,.docx,.pptx,.txt,.csv" onChange={(event) => {
                const selected = event.target.files?.[0];
                event.target.value = "";
                if (!selected) return;
                if (selected.size > 10 * 1024 * 1024) { setError("El archivo supera el máximo de 10 MB"); return; }
                setResourceFile(selected);
                setResourceUrl("");
                if (selected.type.startsWith("image/")) setResourceKind("IMAGE");
                else if (selected.type.startsWith("video/")) setResourceKind("VIDEO");
                else setResourceKind("FILE");
                setError("");
                if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
              }} />
              <div className="flex items-center gap-2 text-xs text-text-subtle"><span className="h-px flex-1 bg-border-subtle" /> o usá una URL <span className="h-px flex-1 bg-border-subtle" /></div>
              <input value={resourceUrl} onChange={(event) => { setResourceUrl(event.target.value); setResourceFile(null); }} maxLength={2_000} placeholder="https://…" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-resource/30" />
            </>
          )}
        </div>
      )}

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

      <button type="submit" disabled={loading || uploading}
        className={`w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${selectedStyle.btnCls}`}>
        {!loading && <BookOpen className="w-5 h-5" />}
        {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Subiendo archivo…</> : loading
          ? (kernelSlug ? "Creando y adjuntando..." : "Creando...")
          : `Crear ${selectedStyle.label}`}
      </button>
    </form>
  );
}
