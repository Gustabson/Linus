"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Palette, RotateCcw, Loader2, Check } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { PRESET_LIGHT, PRESET_DARK } from "@/lib/theme";

type Mode = "light" | "dark" | "custom";

interface CustomColors {
  themeBg:      string;
  themeSurface: string;
  themeBorder:  string;
  themeText:    string;
  themePrimary: string;
}

interface Props {
  initialMode:   Mode;
  initialColors: CustomColors;
}

const COLOR_FIELDS: { key: keyof CustomColors; label: string; desc: string }[] = [
  { key: "themeBg",      label: "Fondo general",   desc: "Color de la página detrás de los cards" },
  { key: "themeSurface", label: "Cards y paneles",  desc: "Fondo de tarjetas, menús y formularios" },
  { key: "themeBorder",  label: "Bordes",           desc: "Líneas divisorias y contornos" },
  { key: "themeText",    label: "Texto",            desc: "Color de todo el texto de la interfaz" },
  { key: "themePrimary", label: "Color primario",   desc: "Botones principales y acentos" },
];

export function ConfigApariencia({ initialMode, initialColors }: Props) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode,   setMode]   = useState<Mode>(initialMode);
  const [colors, setColors] = useState<CustomColors>(
    initialColors.themeBg ? initialColors : { ...PRESET_LIGHT }
  );
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");

  function handleSave() {
    setSaved(false); setError("");
    startTransition(async () => {
      const body: Record<string, unknown> = { themeMode: mode };
      if (mode === "custom") Object.assign(body, colors);

      const res = await fetch("/api/configuracion", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Error al guardar."); return; }

      if (mode === "light") setTheme("light");
      if (mode === "dark")  setTheme("dark");

      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  if (!mounted) return null;

  return (
    <SectionCard title="Apariencia" description="Elegí el tema de la interfaz o personalizalo a tu gusto.">

      {/* Selector de modo */}
      <div className="flex items-center gap-2 p-1 bg-bg rounded-xl border border-border w-fit">
        {([
          { value: "light",  icon: Sun,     label: "Claro"          },
          { value: "dark",   icon: Moon,    label: "Oscuro"         },
          { value: "custom", icon: Palette, label: "Personalizado"  },
        ] as { value: Mode; icon: React.ElementType; label: string }[]).map(({ value, icon: Icon, label }) => (
          <button key={value} onClick={() => setMode(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === value
                ? "bg-surface shadow-sm text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Color pickers */}
      {mode === "custom" && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-subtle">Empezar desde:</span>
            <button onClick={() => setColors({ ...PRESET_LIGHT })}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors">
              Preset claro
            </button>
            <button onClick={() => setColors({ ...PRESET_DARK })}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors">
              Preset oscuro
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border">
                <label className="relative shrink-0 cursor-pointer">
                  <div className="w-10 h-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: colors[key] }} />
                  <input type="color" value={colors[key]}
                    onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text leading-none">{label}</p>
                  <p className="text-xs text-text-subtle mt-0.5">{desc}</p>
                  <p className="text-xs font-mono text-text-subtle mt-0.5">{colors[key]}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-subtle">
            Si los colores quedan ilegibles, podés ir a{" "}
            <a href="/reset" className="underline hover:text-text">eduhub.vercel.app/reset</a>
            {" "}para restablecer el tema.
          </p>

          <button onClick={() => setColors({ ...PRESET_LIGHT })}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer colores predeterminados
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar"}
        </Button>
      </div>
    </SectionCard>
  );
}
