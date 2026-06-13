"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Palette, RotateCcw, Loader2, Check } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button }      from "@/components/ui/Button";
import { PRESET_LIGHT, PRESET_DARK, buildThemeCookie } from "@/lib/theme-config";

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

const CORE_CSS_VARS = [
  "--bg",
  "--surface",
  "--border",
  "--border-subtle",
  "--text",
  "--text-muted",
  "--text-subtle",
  "--primary",
  "--primary-h",
] as const;

interface ThemeSnapshot {
  mode:          Mode;
  colors:        CustomColors;
  sidebarColors: SidebarColors;
  ctColors:      ContentTypeColors;
}

function applyThemeVars({ mode, colors, sidebarColors, ctColors }: ThemeSnapshot) {
  const r = document.documentElement;
  const set = (k: string, v: string) => r.style.setProperty(k, v);

  r.classList.toggle("dark", mode === "dark");

  if (mode === "custom") {
    set("--bg",            colors.themeBg);
    set("--surface",       colors.themeSurface);
    set("--border",        colors.themeBorder);
    set("--border-subtle", colors.themeBorder);
    set("--text",          colors.themeText);
    set("--text-muted",    colors.themeText + "cc");
    set("--text-subtle",   colors.themeText + "88");
    set("--primary",       colors.themePrimary);
    set("--primary-h",     colors.themePrimary);
  } else {
    CORE_CSS_VARS.forEach((key) => r.style.removeProperty(key));
  }

  set("--sidebar-bg",   sidebarColors.themeSidebarBg);
  set("--sidebar-text", sidebarColors.themeSidebarText);
  set("--kernel",      ctColors.themeKernel);
  set("--kernel-h",    ctColors.themeKernel);
  set("--module",      ctColors.themeModule);
  set("--module-h",    ctColors.themeModule);
  set("--resource",    ctColors.themeResource);
  set("--resource-h",  ctColors.themeResource);
}

function readThemeCookie(): ThemeSnapshot | null {
  const raw = document.cookie
    .split("; ")
    .filter((row) => row.startsWith("eduhub_theme="))
    .at(-1)
    ?.split("=")[1];
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, string>;
    const mode: Mode = parsed.mode === "dark" || parsed.mode === "custom" ? parsed.mode : "light";

    return {
      mode,
      colors: {
        themeBg:      parsed.bg,
        themeSurface: parsed.surface,
        themeBorder:  parsed.border,
        themeText:    parsed.text,
        themePrimary: parsed.primary,
      },
      sidebarColors: {
        themeSidebarBg:   parsed.sidebarBg,
        themeSidebarText: parsed.sidebarText,
      },
      ctColors: {
        themeKernel:   parsed.kernel,
        themeModule:   parsed.module,
        themeResource: parsed.resource,
      },
    };
  } catch {
    return null;
  }
}

function writeThemeCookie(snapshot: ThemeSnapshot) {
  const themeCookie = buildThemeCookie({
    ...(snapshot.mode === "custom" ? snapshot.colors : {}),
    ...snapshot.sidebarColors,
    ...snapshot.ctColors,
  });
  themeCookie.mode = snapshot.mode;

  document.cookie = "eduhub_theme=;path=/configuracion;max-age=0;SameSite=Lax";
  document.cookie = `eduhub_theme=${encodeURIComponent(JSON.stringify(themeCookie))};path=/;max-age=31536000;SameSite=Lax`;
}

async function persistTheme(snapshot: ThemeSnapshot, keepalive = false) {
  const body: Record<string, unknown> = {
    themeMode: snapshot.mode,
    ...snapshot.sidebarColors,
    ...snapshot.ctColors,
  };
  if (snapshot.mode === "custom") Object.assign(body, snapshot.colors);

  const res = await fetch("/api/configuracion", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
}

export function ConfigApariencia({
  initialMode,
  initialColors,
  initialSidebarColors,
  initialContentColors,
}: Props) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [mode,   setMode]   = useState<Mode>(initialMode);
  const [colors, setColors] = useState<CustomColors>(
    initialColors.themeBg ? initialColors : { ...PRESET_LIGHT }
  );
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>({
    themeSidebarBg:   initialSidebarColors.themeSidebarBg   || DEFAULT_SIDEBAR_BG,
    themeSidebarText: initialSidebarColors.themeSidebarText || DEFAULT_SIDEBAR_TEXT,
  });
  const [ctColors, setCtColors] = useState<ContentTypeColors>(initialContentColors);

  const [saving,  setSaving]       = useState(false);
  const [saved,   setSaved]        = useState(false);
  const [error,   setError]        = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<ThemeSnapshot | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const cookieTheme = readThemeCookie();
    if (!cookieTheme) {
      mountedRef.current = true;
      setMounted(true);
      return;
    }

    const nextMode = cookieTheme.mode;
    const nextColors = nextMode === "custom" ? {
      themeBg:      cookieTheme.colors.themeBg      || initialColors.themeBg,
      themeSurface: cookieTheme.colors.themeSurface || initialColors.themeSurface,
      themeBorder:  cookieTheme.colors.themeBorder  || initialColors.themeBorder,
      themeText:    cookieTheme.colors.themeText    || initialColors.themeText,
      themePrimary: cookieTheme.colors.themePrimary || initialColors.themePrimary,
    } : colors;
    const nextSidebarColors = {
      themeSidebarBg:   cookieTheme.sidebarColors.themeSidebarBg   || sidebarColors.themeSidebarBg,
      themeSidebarText: cookieTheme.sidebarColors.themeSidebarText || sidebarColors.themeSidebarText,
    };
    const nextCtColors = {
      themeKernel:   cookieTheme.ctColors.themeKernel   || ctColors.themeKernel,
      themeModule:   cookieTheme.ctColors.themeModule   || ctColors.themeModule,
      themeResource: cookieTheme.ctColors.themeResource || ctColors.themeResource,
    };

    setMode(nextMode);
    setColors(nextColors);
    setSidebarColors(nextSidebarColors);
    setCtColors(nextCtColors);
    applyThemeVars({
      mode: nextMode,
      colors: nextColors,
      sidebarColors: nextSidebarColors,
      ctColors: nextCtColors,
    });
    mountedRef.current = true;
    setMounted(true);
    // Run once on mount; initial props/state are the server fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeVars({ mode, colors, sidebarColors, ctColors });
  }, [mounted, mode, colors, sidebarColors, ctColors]);

  function enqueueSave(snapshot: ThemeSnapshot, version: number, keepalive = true) {
    const task = saveQueueRef.current
      .catch(() => undefined)
      .then(() => persistTheme(snapshot, keepalive));

    saveQueueRef.current = task.catch(() => undefined);
    void task.then(
      () => {
        if (!mountedRef.current || version !== saveVersionRef.current) return;
        setSaving(false);
        setSaved(true);
        setTimeout(() => {
          if (mountedRef.current && version === saveVersionRef.current) setSaved(false);
        }, 3000);
      },
      (cause: unknown) => {
        if (!mountedRef.current || version !== saveVersionRef.current) return;
        setSaving(false);
        setError(cause instanceof Error ? cause.message : "Error al guardar.");
      },
    );
  }

  function scheduleSave(snapshot: ThemeSnapshot) {
    const version = ++saveVersionRef.current;
    pendingSnapshotRef.current = snapshot;
    setSaving(true);
    setSaved(false);
    setError("");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSnapshotRef.current = null;
      enqueueSave(snapshot, version);
    }, 350);
  }

  function updateTheme(snapshot: ThemeSnapshot) {
    setMode(snapshot.mode);
    setColors(snapshot.colors);
    setSidebarColors(snapshot.sidebarColors);
    setCtColors(snapshot.ctColors);
    setTheme(snapshot.mode === "dark" ? "dark" : "light");
    writeThemeCookie(snapshot);
    applyThemeVars(snapshot);
    scheduleSave(snapshot);
  }

  function handleSave() {
    const snapshot: ThemeSnapshot = { mode, colors, sidebarColors, ctColors };
    const version = ++saveVersionRef.current;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    pendingSnapshotRef.current = null;
    setSaving(true);
    setSaved(false);
    setError("");
    writeThemeCookie(snapshot);
    applyThemeVars(snapshot);
    enqueueSave(snapshot, version);
  }

  useEffect(() => () => {
    mountedRef.current = false;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const pendingSnapshot = pendingSnapshotRef.current;
    if (pendingSnapshot) {
      void saveQueueRef.current
        .catch(() => undefined)
        .then(() => persistTheme(pendingSnapshot, true))
        .catch(() => undefined);
    }
  }, []);

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
            <button key={value} onClick={() => updateTheme({ mode: value, colors, sidebarColors, ctColors })}
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
            <button onClick={() => updateTheme({ mode, colors: { ...PRESET_LIGHT }, sidebarColors, ctColors })}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors">
              Preset claro
            </button>
            <button onClick={() => updateTheme({ mode, colors: { ...PRESET_DARK }, sidebarColors, ctColors })}
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
                    onChange={e => updateTheme({
                      mode,
                      colors: { ...colors, [key]: e.target.value },
                      sidebarColors,
                      ctColors,
                    })}
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

          <button onClick={() => updateTheme({ mode, colors: { ...PRESET_LIGHT }, sidebarColors, ctColors })}
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
                  onChange={e => updateTheme({
                    mode,
                    colors,
                    sidebarColors: { ...sidebarColors, [key]: e.target.value },
                    ctColors,
                  })}
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
          onClick={() => updateTheme({
            mode,
            colors,
            sidebarColors: { themeSidebarBg: DEFAULT_SIDEBAR_BG, themeSidebarText: DEFAULT_SIDEBAR_TEXT },
            ctColors,
          })}
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
                  onChange={e => updateTheme({
                    mode,
                    colors,
                    sidebarColors,
                    ctColors: { ...ctColors, [key]: e.target.value },
                  })}
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
          onClick={() => updateTheme({
            mode,
            colors,
            sidebarColors,
            ctColors: { themeKernel: "#15803d", themeModule: "#1d4ed8", themeResource: "#b45309" },
          })}
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar"}
        </Button>
      </div>
    </SectionCard>
  );
}
