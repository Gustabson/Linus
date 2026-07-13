"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Layers3,
  Loader2,
  Moon,
  Paintbrush,
  Palette,
  PanelLeft,
  RotateCcw,
  Sun,
} from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { PRESET_DARK, PRESET_LIGHT, buildThemeCookie } from "@/lib/theme-config";

type Mode = "light" | "dark" | "custom";
type PaletteSection = "interface" | "sidebar" | "content";

interface CustomColors {
  themeBg: string;
  themeSurface: string;
  themeBorder: string;
  themeText: string;
  themePrimary: string;
}

interface SidebarColors {
  themeSidebarBg: string;
  themeSidebarText: string;
}

interface ContentTypeColors {
  themeKernel: string;
  themeModule: string;
  themeResource: string;
}

interface Props {
  initialMode: Mode;
  initialColors: CustomColors;
  initialSidebarColors: SidebarColors;
  initialContentColors: ContentTypeColors;
}

const COLOR_FIELDS: { key: keyof CustomColors; label: string; desc: string }[] = [
  { key: "themeBg", label: "Fondo general", desc: "Área exterior de la aplicación" },
  { key: "themeSurface", label: "Cards y paneles", desc: "Tarjetas, menús y formularios" },
  { key: "themeBorder", label: "Bordes", desc: "Divisores y contornos" },
  { key: "themeText", label: "Texto", desc: "Texto principal de la interfaz" },
  { key: "themePrimary", label: "Color principal", desc: "Botones, pestañas y acentos" },
];

const SIDEBAR_FIELDS: { key: keyof SidebarColors; label: string; desc: string }[] = [
  { key: "themeSidebarBg", label: "Fondo de la barra", desc: "Fondo de la navegación lateral" },
  { key: "themeSidebarText", label: "Texto de la barra", desc: "Íconos y etiquetas de navegación" },
];

const CONTENT_TYPE_FIELDS: {
  key: keyof ContentTypeColors;
  label: string;
  desc: string;
  default: string;
}[] = [
  { key: "themeKernel", label: "Kernel", desc: "Currículos base", default: "#15803d" },
  { key: "themeModule", label: "Módulo", desc: "Unidades didácticas", default: "#1d4ed8" },
  { key: "themeResource", label: "Recurso", desc: "Materiales de apoyo", default: "#b45309" },
];

const DEFAULT_SIDEBAR_BG = "#15803d";
const DEFAULT_SIDEBAR_TEXT = "#ffffff";
const DEFAULT_CONTENT_COLORS: ContentTypeColors = {
  themeKernel: "#15803d",
  themeModule: "#1d4ed8",
  themeResource: "#b45309",
};

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
  mode: Mode;
  colors: CustomColors;
  sidebarColors: SidebarColors;
  ctColors: ContentTypeColors;
}

function channelLuminance(value: number) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => {
    const normalized = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return 1;
    const red = channelLuminance(parseInt(normalized.slice(0, 2), 16));
    const green = channelLuminance(parseInt(normalized.slice(2, 4), 16));
    const blue = channelLuminance(parseInt(normalized.slice(4, 6), 16));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const one = luminance(first);
  const two = luminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

function applyThemeVars({ mode, colors, sidebarColors, ctColors }: ThemeSnapshot) {
  const root = document.documentElement;
  const set = (key: string, value: string) => root.style.setProperty(key, value);

  root.classList.toggle("dark", mode === "dark");
  if (mode === "custom") {
    set("--bg", colors.themeBg);
    set("--surface", colors.themeSurface);
    set("--border", colors.themeBorder);
    set("--border-subtle", colors.themeBorder);
    set("--text", colors.themeText);
    set("--text-muted", `${colors.themeText}cc`);
    set("--text-subtle", `${colors.themeText}88`);
    set("--primary", colors.themePrimary);
    set("--primary-h", colors.themePrimary);
  } else {
    CORE_CSS_VARS.forEach((key) => root.style.removeProperty(key));
  }

  set("--sidebar-bg", sidebarColors.themeSidebarBg);
  set("--sidebar-text", sidebarColors.themeSidebarText);
  set("--kernel", ctColors.themeKernel);
  set("--kernel-h", ctColors.themeKernel);
  set("--module", ctColors.themeModule);
  set("--module-h", ctColors.themeModule);
  set("--resource", ctColors.themeResource);
  set("--resource-h", ctColors.themeResource);
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
    return {
      mode: parsed.mode === "dark" || parsed.mode === "custom" ? parsed.mode : "light",
      colors: {
        themeBg: parsed.bg,
        themeSurface: parsed.surface,
        themeBorder: parsed.border,
        themeText: parsed.text,
        themePrimary: parsed.primary,
      },
      sidebarColors: {
        themeSidebarBg: parsed.sidebarBg,
        themeSidebarText: parsed.sidebarText,
      },
      ctColors: {
        themeKernel: parsed.kernel,
        themeModule: parsed.module,
        themeResource: parsed.resource,
      },
    };
  } catch {
    return null;
  }
}

function writeThemeCookie(snapshot: ThemeSnapshot) {
  const cookie = buildThemeCookie({
    ...(snapshot.mode === "custom" ? snapshot.colors : {}),
    ...snapshot.sidebarColors,
    ...snapshot.ctColors,
  });
  cookie.mode = snapshot.mode;
  document.cookie = "eduhub_theme=;path=/configuracion;max-age=0;SameSite=Lax";
  document.cookie = `eduhub_theme=${encodeURIComponent(JSON.stringify(cookie))};path=/;max-age=31536000;SameSite=Lax`;
}

async function persistTheme(snapshot: ThemeSnapshot, keepalive = false) {
  const body: Record<string, unknown> = {
    themeMode: snapshot.mode,
    ...snapshot.sidebarColors,
    ...snapshot.ctColors,
  };
  if (snapshot.mode === "custom") Object.assign(body, snapshot.colors);

  const response = await fetch("/api/configuracion", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Error al guardar.");
}

function ColorField({
  value,
  label,
  description,
  onChange,
}: {
  value: string;
  label: string;
  description: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg p-3 transition-colors hover:border-primary/40">
      <span
        className="h-11 w-11 shrink-0 rounded-xl border border-border shadow-sm ring-2 ring-transparent transition group-hover:ring-primary/15"
        style={{ backgroundColor: value }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-text">{label}</span>
        <span className="block truncate text-xs text-text-subtle">{description}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase text-text-muted">{value}</span>
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        aria-label={`Elegir ${label.toLowerCase()}`}
      />
    </label>
  );
}

export function ConfigApariencia({
  initialMode,
  initialColors,
  initialSidebarColors,
  initialContentColors,
}: Props) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [colors, setColors] = useState<CustomColors>(
    initialColors.themeBg ? initialColors : { ...PRESET_LIGHT },
  );
  const [sidebarColors, setSidebarColors] = useState<SidebarColors>({
    themeSidebarBg: initialSidebarColors.themeSidebarBg || DEFAULT_SIDEBAR_BG,
    themeSidebarText: initialSidebarColors.themeSidebarText || DEFAULT_SIDEBAR_TEXT,
  });
  const [ctColors, setCtColors] = useState<ContentTypeColors>({
    themeKernel: initialContentColors.themeKernel || DEFAULT_CONTENT_COLORS.themeKernel,
    themeModule: initialContentColors.themeModule || DEFAULT_CONTENT_COLORS.themeModule,
    themeResource: initialContentColors.themeResource || DEFAULT_CONTENT_COLORS.themeResource,
  });
  const [paletteSection, setPaletteSection] = useState<PaletteSection>("interface");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
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
    const nextColors = nextMode === "custom"
      ? {
          themeBg: cookieTheme.colors.themeBg || initialColors.themeBg,
          themeSurface: cookieTheme.colors.themeSurface || initialColors.themeSurface,
          themeBorder: cookieTheme.colors.themeBorder || initialColors.themeBorder,
          themeText: cookieTheme.colors.themeText || initialColors.themeText,
          themePrimary: cookieTheme.colors.themePrimary || initialColors.themePrimary,
        }
      : colors;
    const nextSidebarColors = {
      themeSidebarBg: cookieTheme.sidebarColors.themeSidebarBg || sidebarColors.themeSidebarBg,
      themeSidebarText: cookieTheme.sidebarColors.themeSidebarText || sidebarColors.themeSidebarText,
    };
    const nextCtColors = {
      themeKernel: cookieTheme.ctColors.themeKernel || ctColors.themeKernel,
      themeModule: cookieTheme.ctColors.themeModule || ctColors.themeModule,
      themeResource: cookieTheme.ctColors.themeResource || ctColors.themeResource,
    };

    setMode(nextMode);
    setColors(nextColors);
    setSidebarColors(nextSidebarColors);
    setCtColors(nextCtColors);
    applyThemeVars({ mode: nextMode, colors: nextColors, sidebarColors: nextSidebarColors, ctColors: nextCtColors });
    mountedRef.current = true;
    setMounted(true);
    // The server props are the fallback when no valid cookie exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) applyThemeVars({ mode, colors, sidebarColors, ctColors });
  }, [mounted, mode, colors, sidebarColors, ctColors]);

  function enqueueSave(snapshot: ThemeSnapshot, version: number, keepalive = true) {
    const task = saveQueueRef.current.catch(() => undefined).then(() => persistTheme(snapshot, keepalive));
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

  const interfaceContrast = contrastRatio(colors.themeBg, colors.themeText);
  const sidebarContrast = contrastRatio(sidebarColors.themeSidebarBg, sidebarColors.themeSidebarText);
  const status = saving ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando
    </span>
  ) : saved ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
      <Check className="h-3.5 w-3.5" /> Guardado
    </span>
  ) : null;

  const modeOptions: { value: Mode; label: string; description: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", description: "Luminoso y limpio", icon: Sun },
    { value: "dark", label: "Oscuro", description: "Cómodo con poca luz", icon: Moon },
    { value: "custom", label: "Personalizado", description: "Tu propia paleta", icon: Palette },
  ];
  const paletteOptions: { value: PaletteSection; label: string; icon: typeof Paintbrush }[] = [
    { value: "interface", label: "Interfaz", icon: Paintbrush },
    { value: "sidebar", label: "Barra lateral", icon: PanelLeft },
    { value: "content", label: "Tipos", icon: Layers3 },
  ];

  return (
    <SectionCard
      title="Apariencia"
      description="Elegí el aspecto de EduHub. Cada cambio se previsualiza y guarda automáticamente."
      action={status}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {modeOptions.map(({ value, label, description, icon: Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => updateTheme({
                mode: value,
                colors: value === "custom" && mode !== "custom"
                  ? { ...(mode === "dark" ? PRESET_DARK : PRESET_LIGHT) }
                  : colors,
                sidebarColors,
                ctColors,
              })}
              className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-bg hover:border-primary/35"}`}
              aria-pressed={active}
            >
              <span className="mb-3 flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-primary text-white" : "bg-surface text-text-muted"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </span>
              <span className="block text-sm font-bold text-text">{label}</span>
              <span className="mt-0.5 block text-xs text-text-subtle">{description}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-bg p-1" role="tablist" aria-label="Paletas de colores">
            {paletteOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={paletteSection === value}
                onClick={() => setPaletteSection(value)}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${paletteSection === value ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {paletteSection === "interface" && (
            <div className="space-y-3">
              {mode !== "custom" ? (
                <div className="rounded-2xl border border-border bg-bg p-5 text-center">
                  <Paintbrush className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-2 text-sm font-bold text-text">El preset controla esta paleta</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-subtle">
                    Pasá a Personalizado para cambiar el fondo, los paneles, los bordes, el texto y el color principal.
                  </p>
                  <button
                    type="button"
                    onClick={() => updateTheme({
                      mode: "custom",
                      colors: { ...(mode === "dark" ? PRESET_DARK : PRESET_LIGHT) },
                      sidebarColors,
                      ctColors,
                    })}
                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Personalizar tema
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs text-text-subtle">Empezar desde</span>
                    <button type="button" onClick={() => updateTheme({ mode, colors: { ...PRESET_LIGHT }, sidebarColors, ctColors })} className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text">Claro</button>
                    <button type="button" onClick={() => updateTheme({ mode, colors: { ...PRESET_DARK }, sidebarColors, ctColors })} className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text">Oscuro</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {COLOR_FIELDS.map(({ key, label, desc }) => (
                      <ColorField
                        key={key}
                        value={colors[key]}
                        label={label}
                        description={desc}
                        onChange={(value) => updateTheme({ mode, colors: { ...colors, [key]: value }, sidebarColors, ctColors })}
                      />
                    ))}
                  </div>
                  {interfaceContrast < 4.5 && (
                    <div className="flex gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-text">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span><strong>Contraste bajo ({interfaceContrast.toFixed(1)}:1).</strong> El texto puede ser difícil de leer sobre el fondo general.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {paletteSection === "sidebar" && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-text-subtle">La navegación lateral mantiene esta combinación en cualquier modo.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SIDEBAR_FIELDS.map(({ key, label, desc }) => (
                  <ColorField
                    key={key}
                    value={sidebarColors[key]}
                    label={label}
                    description={desc}
                    onChange={(value) => updateTheme({ mode, colors, sidebarColors: { ...sidebarColors, [key]: value }, ctColors })}
                  />
                ))}
              </div>
              {sidebarContrast < 4.5 && (
                <div className="flex gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-text">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span><strong>Contraste bajo ({sidebarContrast.toFixed(1)}:1).</strong> La navegación puede resultar difícil de leer.</span>
                </div>
              )}
              <button type="button" onClick={() => updateTheme({ mode, colors, sidebarColors: { themeSidebarBg: DEFAULT_SIDEBAR_BG, themeSidebarText: DEFAULT_SIDEBAR_TEXT }, ctColors })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text">
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar barra
              </button>
            </div>
          )}

          {paletteSection === "content" && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-text-subtle">Estos acentos permiten reconocer cada tipo de contenido en toda la plataforma.</p>
              <div className="grid gap-3">
                {CONTENT_TYPE_FIELDS.map(({ key, label, desc, default: fallback }) => (
                  <ColorField
                    key={key}
                    value={ctColors[key] || fallback}
                    label={label}
                    description={desc}
                    onChange={(value) => updateTheme({ mode, colors, sidebarColors, ctColors: { ...ctColors, [key]: value } })}
                  />
                ))}
              </div>
              <button type="button" onClick={() => updateTheme({ mode, colors, sidebarColors, ctColors: { ...DEFAULT_CONTENT_COLORS } })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text">
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar tipos
              </button>
            </div>
          )}
        </div>

        <aside className="overflow-hidden rounded-2xl border border-border bg-bg xl:sticky xl:top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-bold text-text">Vista previa</span>
            <span className="text-[10px] uppercase tracking-wide text-text-subtle">En vivo</span>
          </div>
          <div className="p-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex min-h-48">
                <div className="w-[4.5rem] shrink-0 p-2" style={{ backgroundColor: sidebarColors.themeSidebarBg, color: sidebarColors.themeSidebarText }}>
                  <div className="mb-4 flex items-center gap-1 text-[9px] font-bold"><span className="h-3 w-3 rounded bg-current opacity-90" /> Edu</div>
                  {["Inicio", "Espacio", "Explorar"].map((item, index) => (
                    <div key={item} className={`mb-1 rounded px-1.5 py-1 text-[8px] ${index === 0 ? "bg-white/15 font-bold" : "opacity-75"}`}>{item}</div>
                  ))}
                </div>
                <div className="min-w-0 flex-1 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-primary">Tu espacio</p>
                  <p className="mt-1 text-sm font-bold text-text">Una interfaz a tu medida</p>
                  <div className="mt-3 rounded-lg border border-border bg-bg p-2.5">
                    <p className="text-[10px] font-bold text-text">Contenido educativo</p>
                    <p className="mt-1 text-[8px] text-text-subtle">Los colores se aplican en tiempo real.</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: ctColors.themeKernel, backgroundColor: `${ctColors.themeKernel}1a` }}>Kernel</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: ctColors.themeModule, backgroundColor: `${ctColors.themeModule}1a` }}>Módulo</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: ctColors.themeResource, backgroundColor: `${ctColors.themeResource}1a` }}>Recurso</span>
                    </div>
                  </div>
                  <button type="button" tabIndex={-1} className="mt-3 rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-bold text-white">Acción principal</button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-subtle">
          Si un tema queda ilegible, usá <a href="/reset" className="font-mono underline hover:text-text">/reset</a> para recuperar el modo claro.
        </p>
        <button
          type="button"
          onClick={() => updateTheme({
            mode: "light",
            colors: { ...PRESET_LIGHT },
            sidebarColors: { themeSidebarBg: DEFAULT_SIDEBAR_BG, themeSidebarText: DEFAULT_SIDEBAR_TEXT },
            ctColors: { ...DEFAULT_CONTENT_COLORS },
          })}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar tema completo
        </button>
      </div>
    </SectionCard>
  );
}
