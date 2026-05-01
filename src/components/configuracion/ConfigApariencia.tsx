"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Palette, RotateCcw, Loader2, Check, AlertCircle } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { contrastRatio, PRESET_LIGHT, PRESET_DARK } from "@/lib/theme";

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
  { key: "themeBg",      label: "Fondo general",    desc: "Color de la página detrás de los cards" },
  { key: "themeSurface", label: "Cards y paneles",  desc: "Fondo de tarjetas, menús y formularios" },
  { key: "themeBorder",  label: "Bordes",            desc: "Líneas divisorias y contornos" },
  { key: "themeText",    label: "Texto",             desc: "Color de todo el texto de la interfaz" },
  { key: "themePrimary", label: "Color primario",    desc: "Botones principales y acentos" },
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
  const [contrastWarn,  setContrastWarn]  = useState("");   // aviso, no bloquea
  const [contrastBlock, setContrastBlock] = useState(false); // solo si es imposible leer
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");

  function updateColor(key: keyof CustomColors, value: string) {
    const next = { ...colors, [key]: value };
    setColors(next);
    // Live contrast check
    const ratio  = contrastRatio(next.themeText, next.themeBg);
    const ratio2 = contrastRatio(next.themeText, next.themeSurface);
    const min    = Math.min(ratio, ratio2);

    // < 1.3 → prácticamente invisible, bloquear guardado
    setContrastBlock(min < 1.3);

    // < 3 → bajo pero legible, solo aviso
    if (min < 1.3) {
      setContrastWarn("El texto es casi invisible sobre el fondo. Cambiá uno de los dos colores.");
    } else if (min < 3) {
      setContrastWarn("El contraste es bajo — puede ser difícil de leer en pantallas brillantes. Podés guardarlo igual.");
    } else {
      setContrastWarn("");
    }
  }

  function applyPreset(preset: typeof PRESET_LIGHT) {
    setColors(preset);
    setContrastWarn("");
    setContrastBlock(false);
  }

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

      // Sync next-themes for light/dark
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

      {/* ── Selector de modo ── */}
      <div className="flex items-center gap-2 p-1 bg-bg rounded-xl border border-border w-fit">
        {([
          { value: "light",  icon: Sun,     label: "Claro"       },
          { value: "dark",   icon: Moon,    label: "Oscuro"      },
          { value: "custom", icon: Palette, label: "Personalizado" },
        ] as { value: Mode; icon: React.ElementType; label: string }[]).map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
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

      {/* ── Color pickers (solo en modo personalizado) ── */}
      {mode === "custom" && (
        <div className="space-y-4 pt-1">
          {/* Presets rápidos */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-subtle">Empezar desde:</span>
            <button
              onClick={() => applyPreset(PRESET_LIGHT)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors"
            >
              Preset claro
            </button>
            <button
              onClick={() => applyPreset(PRESET_DARK)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors"
            >
              Preset oscuro
            </button>
          </div>

          {/* Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border">
                {/* Color swatch + picker nativo */}
                <label className="relative shrink-0 cursor-pointer">
                  <div
                    className="w-10 h-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: colors[key] }}
                  />
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => updateColor(key, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text leading-none">{label}</p>
                  <p className="text-xs text-text-subtle mt-0.5">{desc}</p>
                  <p className="text-xs font-mono text-text-subtle mt-0.5">{colors[key]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Advertencia de contraste */}
          {contrastWarn && (
            <div className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 border ${
              contrastBlock
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-amber-600 bg-amber-50 border-amber-200"
            }`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {contrastWarn}
            </div>
          )}

          {/* Botón reset */}
          <button
            onClick={() => applyPreset(PRESET_LIGHT)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer colores predeterminados
          </button>
        </div>
      )}

      {/* ── Guardar ── */}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={pending || (mode === "custom" && contrastBlock)}
        >
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar"}
        </Button>
      </div>
    </SectionCard>
  );
}
