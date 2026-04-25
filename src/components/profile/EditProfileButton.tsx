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
        className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Editar perfil
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar perfil</h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
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
