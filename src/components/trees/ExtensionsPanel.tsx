"use client";

import { useState, useRef } from "react";
import { Plus, X, Link, Smartphone, ImageIcon, Video, Wrench, FileText, ExternalLink, Upload, Loader2 } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  LINK: <Link className="w-4 h-4" />,
  APP: <Smartphone className="w-4 h-4" />,
  IMAGE: <ImageIcon className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  FILE: <FileText className="w-4 h-4" />,
  TOOL: <Wrench className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  LINK: "Enlace",
  APP: "App / Herramienta interactiva",
  IMAGE: "Imagen / Infografía",
  VIDEO: "Video",
  FILE: "Archivo",
  TOOL: "Recurso didáctico",
};

interface Extension {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  author: { name: string | null; image: string | null };
}

export function ExtensionsPanel({
  treeSlug,
  initialExtensions,
  isOwner,
}: {
  treeSlug: string;
  initialExtensions: Extension[];
  isOwner: boolean;
}) {
  const [extensions, setExtensions] = useState(initialExtensions);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: "LINK", title: "", description: "", url: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      alert("Error al subir el archivo");
      return null;
    }
    const data = await res.json();
    return data as { url: string; name: string; type: string };
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (!result) return;

    // Auto-detect type
    let detectedType = "FILE";
    if (file.type.startsWith("image/")) detectedType = "IMAGE";
    else if (file.type.startsWith("video/")) detectedType = "VIDEO";

    setForm((prev) => ({
      ...prev,
      type: detectedType,
      title: prev.title || file.name.replace(/\.[^.]+$/, ""),
      url: result.url,
    }));
  }

  async function addExtension() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/trees/${treeSlug}/extensions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const ext = await res.json();
      setExtensions((prev) => [ext, ...prev]);
      setForm({ type: "LINK", title: "", description: "", url: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function removeExtension(id: string) {
    const res = await fetch(`/api/trees/${treeSlug}/extensions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extensionId: id }),
    });
    if (res.ok) setExtensions((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Recursos</h2>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-3">
          {/* File upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Subiendo archivo...</span>
              </div>
            ) : form.url ? (
              <p className="text-sm text-green-700 font-medium">✓ Archivo subido</p>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">
                  Subir archivo <span className="text-green-700">(imágenes, PDFs, videos, docs)</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Máximo 10MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.zip,.doc,.docx,.ppt,.pptx,.txt,.csv" />

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-100" />
            o pegá una URL
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Título *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nombre del recurso"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">URL (si no subiste archivo)</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Descripción</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="¿Para qué sirve este recurso?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={addExtension} disabled={saving || !form.title.trim()}
              className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50">
              {saving ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {extensions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
          No hay recursos todavía.
          {isOwner && " Agregá links, archivos o apps que complementen este currículo."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {extensions.map((ext) => (
            <div key={ext.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 group">
              <div className="bg-green-50 p-2 rounded-lg text-green-700 shrink-0">
                {TYPE_ICONS[ext.type] ?? <Link className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm truncate">{ext.title}</p>
                    {ext.description && <p className="text-gray-500 text-xs mt-0.5">{ext.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{TYPE_LABELS[ext.type]}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ext.url && (
                      <a href={ext.url} target="_blank" rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-green-700">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {isOwner && (
                      <button onClick={() => removeExtension(ext.id)}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
