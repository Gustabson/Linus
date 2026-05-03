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

interface SidebarColors {
  themeSidebarBg:   string;
  themeSidebarText: string;
}

interface ContentTypeColors {
  themeKernel:   string;
  themeModule:   string;
  themeResource: string;
}

interface Props {
  initialMode:          Mode;
  initialColors:        CustomColors;
  initialSidebarColors: SidebarColors;
  initialContentColors: ContentTypeColors;
}

const COLOR_FIELDS: { key: keyof CustomColors; label: string; desc: string }[] = [
  { key: "themeBg",      label: "Fondo general",   desc: "Color de la página detrás de los cards" },
  { key: "themeSurface", label: "Cards y paneles",  desc: "Fondo de tarjetas, menús y formularios" },
  { key: "themeBorder",  label: "Bordes",           desc: "Líneas divisorias y contornos" },
  { key: "themeText",    label: "Texto",            desc: "Color de todo el texto de la interfaz" },
  { key: "themePrimary", label: "Color primario",   desc: "Botones, tabs activos y acentos" },
];

const SIDEBAR_FIELDS: { key: keyof SidebarColors; label: string; desc: string }[] = [
  { key: "themeSidebarBg",   label: "Fondo de la barra", desc: "Color de fondo de la barra lateral" },
  { key: "themeSidebarText", label: "Texto de la barra", desc: "Color de íconos y letras en la barra" },
];

const CONTENT_TYPE_FIELDS: { key: keyof ContentTypeColors; label: string; desc: string; default: string }[] = [
  { key: "themeKernel",   label: "Kernel",  desc: "Currículos base y núcleos educativos", default: "#15803d" },
  { key: "themeModule",   label: "Módulo",  desc: "Unidades didácticas independientes",   default: "#1d4ed8" },
  { key: "themeResource", label: "Recurso", desc: "Materiales y herramientas de apoyo",   default: "#b45309" },
];

// Default sidebar bg = primary color (resolves at runtime via CSS var)
const DEFAULT_SIDEBAR_BG   = "#15803d"; // same as PRESET_LIGHT primary
const DEFAULT_SIDEBAR_TEXT = "#ffffff";

export function ConfigApariencia({
  initialMode,
  initialColors,
  initialSidebarColors,
  initialContentColors,
}: Props) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode,   setMode]   = useState<Mode>(initialMode);
  const [colors, setColors] = useState<CustomColors>(
    initialColors.themeBg ? initialColors : { ...PRESET_LIGHT }
  );
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>({
    themeSidebarBg:   initialSidebarColors.themeSidebarBg   || DEFAULT_SIDEBAR_BG,
    themeSidebarText: initialSidebarColors.themeSidebarText || DEFAULT_SIDEBAR_TEXT,
  });
  const [ctColors, setCtColors] = useState<ContentTypeColors>(initialContentColors);

  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");

  function handleSave() {
    setSaved(false); setError("");
    startTransition(async () => {
      const body: Record<string, unknown> = {
        themeMode: mode,
        ...sidebarColors,
        ...ctColors,
      };
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
      <div className="p-1 bg-bg rounded-xl border border-border w-full sm:w-fit">
        <div className="grid grid-cols-2 sm:flex gap-1">
          {([
            { value: "light",  icon: Sun,     label: "Claro",         cls: "" },
            { value: "dark",   icon: Moon,    label: "Oscuro",        cls: "" },
            { value: "custom", icon: Palette, label: "Personalizado", cls: "col-span-2 sm:flex-none" },
          ] as { value: Mode; icon: React.ElementType; label: string; cls: string }[]).map(({ value, icon: Icon, label, cls }) => (
            <button key={value} onClick={() => setMode(value)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${cls} ${
                mode === value
                  ? "bg-surface shadow-sm text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers — UI general (solo en modo personalizado) */}
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
            Si los colores quedan ilegibles, escribí{" "}
            <a href="/reset" className="underline font-mono hover:text-text">/reset</a>
            {" "}en la barra de dirección para restablecer el tema.
          </p>

          <button onClick={() => setColors({ ...PRESET_LIGHT })}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer colores predeterminados
          </button>
        </div>
      )}

      {/* ── Barra lateral ───────────────────────────────────────── */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <p className="text-sm font-medium text-text">Barra lateral</p>
          <p className="text-xs text-text-subtle mt-0.5">
            Personalizá el color de la barra izquierda independientemente del tema.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIDEBAR_FIELDS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border">
              <label className="relative shrink-0 cursor-pointer">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: sidebarColors[key] }} />
                <input type="color" value={sidebarColors[key]}
                  onChange={e => setSidebarColors(c => ({ ...c, [key]: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text leading-none">{label}</p>
                <p className="text-xs text-text-subtle mt-0.5">{desc}</p>
                <p className="text-xs font-mono text-text-subtle mt-0.5">{sidebarColors[key]}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSidebarColors({ themeSidebarBg: DEFAULT_SIDEBAR_BG, themeSidebarText: DEFAULT_SIDEBAR_TEXT })}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar barra por defecto
        </button>
      </div>

      {/* ── Tipos de contenido ────────────────────────────────────────── */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <p className="text-sm font-medium text-text">Colores por tipo de contenido</p>
          <p className="text-xs text-text-subtle mt-0.5">
            Diferenciá visualmente kernels, módulos y recursos en toda la plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CONTENT_TYPE_FIELDS.map(({ key, label, desc, default: def }) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border">
              <label className="relative shrink-0 cursor-pointer">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: ctColors[key] || def }} />
                <input type="color" value={ctColors[key] || def}
                  onChange={e => setCtColors(c => ({ ...c, [key]: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text leading-none">{label}</p>
                <p className="text-xs text-text-subtle mt-0.5">{desc}</p>
                <p className="text-xs font-mono text-text-subtle mt-0.5">{ctColors[key] || def}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setCtColors({ themeKernel: "#15803d", themeModule: "#1d4ed8", themeResource: "#b45309" })}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar colores originales de tipos
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-text-subtle">
        ¿Quedó ilegible? Navegá a{" "}
        <a href="/reset" className="underline font-mono hover:text-text">/reset</a>
        {" "}para restablecer el tema a claro.
      </p>
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
