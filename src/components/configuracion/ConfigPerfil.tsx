"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";

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
    setSaved(false); setError("");
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

  return (
    <SectionCard
      title="Perfil público"
      description="Esta información es visible para el resto de la comunidad."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre completo">
          <Input value={name} onChange={e => setName(e.target.value)}
            placeholder="Tu nombre" maxLength={80} />
        </Field>
        <Field label="Nombre de usuario" hint="Solo letras minúsculas, números, _ y -">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle text-sm select-none">@</span>
            <Input value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="usuario" maxLength={30} className="pl-8" />
          </div>
        </Field>
      </div>

      <Field label="Biografía">
        <Textarea value={bio} onChange={e => setBio(e.target.value)}
          placeholder="Contá algo sobre vos..." maxLength={300} rows={3} />
        <p className="text-xs text-text-subtle text-right mt-1">{bio.length}/300</p>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sitio web">
          <Input value={website} onChange={e => setWebsite(e.target.value)}
            placeholder="https://tusitio.com" type="url" />
        </Field>
        <Field label="Ubicación">
          <Input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Ciudad, País" maxLength={60} />
        </Field>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
        </Button>
      </div>
    </SectionCard>
  );
}
