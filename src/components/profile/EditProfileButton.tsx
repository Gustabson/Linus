"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Save, Camera, Loader2 } from "lucide-react";
import Image from "next/image";

interface ProfileData {
  id:       string;
  name:     string | null;
  username: string | null;
  bio:      string | null;
  website:  string | null;
  location: string | null;
  image:    string | null;
}

export function EditProfileButton({ user }: { user: ProfileData }) {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    name:     user.name     ?? "",
    username: user.username ?? "",
    bio:      user.bio      ?? "",
    website:  user.website  ?? "",
    location: user.location ?? "",
  });

  // Image state
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar 2 MB.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleClose() {
    setOpen(false);
    setError("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      // 1. Upload avatar if changed
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const avatarRes = await fetch("/api/users/avatar", { method: "POST", body: fd });
        if (!avatarRes.ok) {
          const d = await avatarRes.json().catch(() => ({}));
          setError(d.error ?? "Error al subir la foto.");
          setSaving(false);
          return;
        }
      }

      // 2. Save text fields
      const res = await fetch("/api/users/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Error al guardar.");
        setSaving(false);
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setSaving(false);
    }
  }

  // Current displayed avatar (preview > saved > initials)
  const avatarSrc = imagePreview ?? user.image;
  const initials  = (user.name ?? user.username ?? "?")[0].toUpperCase();

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
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle shrink-0">
              <h2 className="font-semibold text-text">Editar perfil</h2>
              <button onClick={handleClose}>
                <X className="w-5 h-5 text-text-subtle" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-5 space-y-5 overflow-y-auto">

              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt="Foto de perfil"
                      width={88}
                      height={88}
                      className="rounded-full object-cover ring-4 ring-bg"
                      unoptimized={!!imagePreview} // blob: URL — skip Next optimization
                    />
                  ) : (
                    <div className="w-22 h-22 w-[88px] h-[88px] rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold ring-4 ring-bg">
                      {initials}
                    </div>
                  )}

                  {/* Camera overlay */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-primary hover:underline"
                >
                  Cambiar foto
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="text-xs text-text-subtle">JPG, PNG o GIF · Máx. 2 MB</p>
              </div>

              {/* Text fields */}
              {([
                { key: "name",     label: "Nombre",    placeholder: "Tu nombre" },
                { key: "username", label: "Usuario",   placeholder: "usuario_unico" },
                { key: "location", label: "Ubicación", placeholder: "Ciudad, País" },
                { key: "website",  label: "Sitio web", placeholder: "https://..." },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-text mb-1">{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-bg text-text"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-text mb-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-bg text-text"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border-subtle flex justify-end gap-3 shrink-0">
              <button
                onClick={handleClose}
                className="text-sm text-text-muted px-4 py-2 rounded-lg hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-h disabled:opacity-50"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : <><Save className="w-4 h-4" /> Guardar</>
                }
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
