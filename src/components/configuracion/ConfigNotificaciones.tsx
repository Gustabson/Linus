"use client";

import { useState } from "react";
import { Bell, Check, GitPullRequest, Heart, Loader2, Mail, MessageSquare, UserPlus } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

interface NotifPrefs {
  notifCorreos: boolean;
  notifComentarios: boolean;
  notifLikes: boolean;
  notifSeguidores: boolean;
  notifPropuestas: boolean;
}

const GROUPS: Array<{
  label: string;
  description: string;
  options: Array<{ key: keyof NotifPrefs; icon: React.ElementType; label: string; desc: string }>;
}> = [
  {
    label: "Mensajes",
    description: "Comunicaciones directas",
    options: [
      { key: "notifCorreos", icon: Mail, label: "Nuevos correos", desc: "Cuando alguien te escriba un correo interno." },
    ],
  },
  {
    label: "Actividad social",
    description: "Interacciones con tu perfil y contenido",
    options: [
      { key: "notifComentarios", icon: MessageSquare, label: "Comentarios", desc: "Cuando alguien comente en tus publicaciones o kernels." },
      { key: "notifLikes", icon: Heart, label: "Me gusta", desc: "Cuando alguien valore tu contenido." },
      { key: "notifSeguidores", icon: UserPlus, label: "Nuevos seguidores", desc: "Cuando alguien empiece a seguirte." },
    ],
  },
  {
    label: "Colaboración",
    description: "Cambios en proyectos compartidos",
    options: [
      { key: "notifPropuestas", icon: GitPullRequest, label: "Propuestas", desc: "Actualizaciones sobre propuestas en tus kernels." },
    ],
  },
];

export function ConfigNotificaciones({ initial }: { initial: NotifPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [savingKey, setSavingKey] = useState<keyof NotifPrefs | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function updatePreference(key: keyof NotifPrefs, value: boolean) {
    if (savingKey) return;
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    setSavingKey(key);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (cause) {
      setPrefs((current) => ({ ...current, [key]: previous }));
      setError(cause instanceof Error ? cause.message : "Error al guardar.");
    } finally {
      setSavingKey(null);
    }
  }

  const status = savingKey ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-text-subtle"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando</span>
  ) : saved ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" /> Guardado</span>
  ) : null;

  return (
    <SectionCard
      title="Notificaciones por correo"
      description="Los cambios se guardan automáticamente."
      action={status}
    >
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <section key={group.label}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Bell className="h-4 w-4" /></span>
              <div>
                <h3 className="text-sm font-bold text-text">{group.label}</h3>
                <p className="text-[11px] text-text-subtle">{group.description}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-bg">
              {group.options.map(({ key, icon: Icon, label, desc }, index) => (
                <div key={key} className={`flex items-center justify-between gap-4 p-4 ${index > 0 ? "border-t border-border-subtle" : ""}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-text-muted"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-subtle">{desc}</p>
                    </div>
                  </div>
                  <Toggle checked={prefs[key]} disabled={savingKey !== null} onChange={(value) => void updatePreference(key, value)} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
    </SectionCard>
  );
}
