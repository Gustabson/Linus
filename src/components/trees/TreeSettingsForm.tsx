"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Eye, EyeOff, Link } from "lucide-react";

interface TreeData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: string;
  contentType: string;
}

export function TreeSettingsForm({ tree, ownerUsername }: { tree: TreeData; ownerUsername: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: tree.title,
    description: tree.description ?? "",
    visibility: tree.visibility,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/trees/${tree.slug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // If slug changed (title change), redirect
      if (data.slug && data.slug !== tree.slug) {
        router.push(`/${ownerUsername}/${data.slug}/configuracion`);
      }
    } else {
      setError(data.error ?? "Error al guardar");
    }
  }

  const visibilityOptions = [
    { value: "PUBLIC", label: "Público", desc: "Cualquiera puede verlo y forkearlo", icon: <Eye className="w-4 h-4" /> },
    { value: "UNLISTED", label: "No listado", desc: "Solo accesible con el link directo", icon: <Link className="w-4 h-4" /> },
    { value: "PRIVATE", label: "Privado", desc: "Solo vos podés verlo", icon: <EyeOff className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-text">Información general</h2>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="¿De qué trata este currículo?"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-3">
        <h2 className="font-semibold text-text">Visibilidad</h2>
        <div className="space-y-2">
          {visibilityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, visibility: opt.value })}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                form.visibility === opt.value
                  ? "border-green-500 bg-green-50"
                  : "border-border hover:border-gray-300"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${form.visibility === opt.value ? "bg-green-100 text-green-700" : "bg-border-subtle text-text-muted"}`}>
                {opt.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.desc}</p>
              </div>
              <div className={`ml-auto w-4 h-4 rounded-full border-2 ${
                form.visibility === opt.value ? "border-green-500 bg-green-500" : "border-gray-300"
              }`} />
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
      </button>

      {/* Danger zone */}
      {tree.contentType !== "KERNEL" && (
        <div className="bg-surface rounded-2xl border border-red-100 p-6 space-y-3">
          <h2 className="font-semibold text-red-700">Zona de peligro</h2>
          <p className="text-sm text-text-muted">
            Archivar el currículo lo ocultará de búsquedas pero los forks existentes seguirán funcionando.
          </p>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            onClick={() => {
              if (confirm("¿Seguro que querés archivar este currículo?")) {
                fetch(`/api/trees/${tree.slug}/settings`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ archived: true }),
                }).then(() => router.push("/dashboard"));
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Archivar currículo
          </button>
        </div>
      )}
    </div>
  );
}
