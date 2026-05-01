"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Save } from "lucide-react";

interface ProfileData {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
}

export function EditProfileButton({ user }: { user: ProfileData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name ?? "",
    username: user.username ?? "",
    bio: user.bio ?? "",
    website: user.website ?? "",
    location: user.location ?? "",
  });

  async function save() {
    setSaving(true);
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-border text-text text-sm px-4 py-2 rounded-lg hover:bg-bg transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Editar perfil
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <h2 className="font-semibold text-text">Editar perfil</h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5 text-text-subtle" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: "name", label: "Nombre", placeholder: "Tu nombre" },
                { key: "username", label: "Usuario", placeholder: "usuario_unico" },
                { key: "location", label: "Ubicación", placeholder: "Ciudad, País" },
                { key: "website", label: "Sitio web", placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-text mb-1">
                    {label}
                  </label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border-subtle flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-text-muted px-4 py-2 rounded-lg hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-h disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
