"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";

interface Props {
  initial: {
    name:     string | null;
    username: string | null;
    bio:      string | null;
    website:  string | null;
    location: string | null;
  };
}

export function ConfigPerfil({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");

  const [name,     setName]     = useState(initial.name     ?? "");
  const [username, setUsername] = useState(initial.username ?? "");
  const [bio,      setBio]      = useState(initial.bio      ?? "");
  const [website,  setWebsite]  = useState(initial.website  ?? "");
  const [location, setLocation] = useState(initial.location ?? "");

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/configuracion", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, username, bio, website, location }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Error al guardar."); return; }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const field = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors";
  const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Perfil público</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Esta información es visible para el resto de la comunidad.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Nombre completo</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Tu nombre" maxLength={80} className={field} />
        </div>
        <div>
          <label className={label}>Nombre de usuario</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
            <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="usuario" maxLength={30}
              className={`${field} pl-8`} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números, _ y -</p>
        </div>
      </div>

      <div>
        <label className={label}>Biografía</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)}
          placeholder="Contá algo sobre vos..." maxLength={300} rows={3}
          className={`${field} resize-none`} />
        <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/300</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Sitio web</label>
          <input value={website} onChange={e => setWebsite(e.target.value)}
            placeholder="https://tusitio.com" type="url" className={field} />
        </div>
        <div>
          <label className={label}>Ubicación</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Ciudad, País" maxLength={60} className={field} />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
        >
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}
