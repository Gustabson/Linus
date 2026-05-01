"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Mail, MessageSquare, Heart, UserPlus, GitPullRequest } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { Toggle }      from "@/components/ui/Toggle";

interface NotifPrefs {
  notifCorreos:     boolean;
  notifComentarios: boolean;
  notifLikes:       boolean;
  notifSeguidores:  boolean;
  notifPropuestas:  boolean;
}

const OPTIONS: { key: keyof NotifPrefs; icon: React.ElementType; label: string; desc: string }[] = [
  { key: "notifCorreos",     icon: Mail,           label: "Nuevos correos",    desc: "Cuando alguien te escriba un correo interno." },
  { key: "notifComentarios", icon: MessageSquare,  label: "Comentarios",       desc: "Cuando alguien comente en tus publicaciones o kernels." },
  { key: "notifLikes",       icon: Heart,          label: "Me gusta",          desc: "Cuando alguien le dé me gusta a tu contenido." },
  { key: "notifSeguidores",  icon: UserPlus,       label: "Nuevos seguidores", desc: "Cuando alguien empiece a seguirte." },
  { key: "notifPropuestas",  icon: GitPullRequest, label: "Propuestas",        desc: "Actualizaciones sobre propuestas en tus kernels." },
];

export function ConfigNotificaciones({ initial }: { initial: NotifPrefs }) {
  const [prefs,   setPrefs] = useState<NotifPrefs>(initial);
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved] = useState(false);
  const [error,   setError] = useState("");

  function handleSave() {
    setSaved(false); setError("");
    startTransition(async () => {
      const res = await fetch("/api/configuracion", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(prefs),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Error al guardar."); return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <SectionCard
      title="Notificaciones por correo"
      description="Elegí qué eventos te notificamos a tu correo electrónico."
    >
      <div className="divide-y divide-border">
        {OPTIONS.map(({ key, icon: Icon, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-border-subtle flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs text-text-subtle mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle
              checked={prefs[key]}
              onChange={v => setPrefs(p => ({ ...p, [key]: v }))}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar preferencias"}
        </Button>
      </div>
    </SectionCard>
  );
}
