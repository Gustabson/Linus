"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Mail, MessageSquare, Heart, UserPlus, GitPullRequest } from "lucide-react";

interface NotifPrefs {
  notifCorreos:     boolean;
  notifComentarios: boolean;
  notifLikes:       boolean;
  notifSeguidores:  boolean;
  notifPropuestas:  boolean;
}

interface Props {
  initial: NotifPrefs;
}

const OPTIONS = [
  {
    key:   "notifCorreos",
    icon:  Mail,
    label: "Nuevos correos",
    desc:  "Recibí un aviso cuando alguien te escriba un correo interno.",
  },
  {
    key:   "notifComentarios",
    icon:  MessageSquare,
    label: "Comentarios",
    desc:  "Cuando alguien comente en tus publicaciones o kernels.",
  },
  {
    key:   "notifLikes",
    icon:  Heart,
    label: "Me gusta",
    desc:  "Cuando alguien le dé me gusta a tu contenido.",
  },
  {
    key:   "notifSeguidores",
    icon:  UserPlus,
    label: "Nuevos seguidores",
    desc:  "Cuando alguien empiece a seguirte.",
  },
  {
    key:   "notifPropuestas",
    icon:  GitPullRequest,
    label: "Propuestas",
    desc:  "Actualizaciones sobre propuestas de edición en tus kernels.",
  },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 focus:outline-none
        ${checked ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
          transform transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

export function ConfigNotificaciones({ initial }: Props) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initial);
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");

  function toggle(key: keyof NotifPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/configuracion", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(prefs),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Notificaciones por correo
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Elegí qué eventos te notificamos a tu dirección de correo electrónico.
        </p>
      </div>

      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
        {OPTIONS.map(({ key, icon: Icon, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle
              checked={prefs[key]}
              onChange={(v) => toggle(key, v)}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

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
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar preferencias"}
        </button>
      </div>
    </section>
  );
}
