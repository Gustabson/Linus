"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BookOpen, CheckCircle, Loader2 } from "lucide-react";

export default function BienvenidaPage() {
  const router = useRouter();
  const { update } = useSession();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const isValid = /^[a-z0-9_-]{3,32}$/.test(username);

  async function checkAvailability(value: string) {
    if (!/^[a-z0-9_-]{3,32}$/.test(value)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(value)}`);
    const data = await res.json();
    setAvailable(data.available);
    setChecking(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setUsername(value);
    setError("");
    setAvailable(null);
    if (value.length >= 3) checkAvailability(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || available === false) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/users/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      // Force full page reload so JWT refreshes with new username
      await update();
      window.location.href = "/dashboard";
    } else {
      setError(data.error ?? "Error al guardar");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">¡Bienvenido a EduHub!</h1>
          <p className="text-text-muted text-sm">
            Elegí un nombre de usuario único. Las demás personas lo usarán para encontrarte.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nombre de usuario
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm select-none">
                @
              </span>
              <input
                value={username}
                onChange={handleChange}
                placeholder="tu_nombre"
                maxLength={32}
                className="w-full border border-border rounded-xl pl-8 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="w-4 h-4 text-text-subtle animate-spin" />}
                {!checking && available === true && <CheckCircle className="w-4 h-4 text-primary" />}
                {!checking && available === false && <span className="text-red-500 text-xs">✗</span>}
              </div>
            </div>
            <p className="text-xs text-text-subtle mt-1">
              Solo letras minúsculas, números, guiones y guiones bajos. 3–32 caracteres.
            </p>
            {available === false && (
              <p className="text-xs text-red-600 mt-1">Ese username ya está en uso, probá otro.</p>
            )}
            {available === true && (
              <p className="text-xs text-primary mt-1">¡Disponible!</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !isValid || available === false || available === null}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-h disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando..." : "Continuar"}
          </button>
        </form>

        <p className="text-center text-xs text-text-subtle">
          Podés cambiarlo después desde tu perfil.
        </p>
      </div>
    </div>
  );
}
