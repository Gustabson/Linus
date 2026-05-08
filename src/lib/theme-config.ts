// ═══════════════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH — every theme property in the app
// ═══════════════════════════════════════════════════════════════════════════
//
// To add a new theme color, add ONE entry to THEME_PROPERTIES below.
// Everything else (cookie, CSS vars, layout, ConfigApariencia) adapts automatically.
//
// Fields:
//   dbField   → Prisma column name (snake_case in DB)
//   cookieKey → key in the eduhub_theme cookie
//   cssVar    → CSS custom property (set on <html>)
//   light     → default hex for light mode
//   dark      → default hex for dark mode
//   group     → "core" (custom mode only), "sidebar", or "content"
//   label     → human-readable name for the settings UI

export interface ThemeProperty {
  dbField:   string;
  cookieKey: string;
  cssVar:    string;
  light:     string;
  dark:      string;
  group:     "core" | "sidebar" | "content";
  label:     string;
}

export const THEME_PROPERTIES: ThemeProperty[] = [
  // ── Core (custom mode only) ────────────────────────────────────────────
  { dbField: "themeBg",      cookieKey: "bg",      cssVar: "--bg",           light: "#f9fafb", dark: "#0f172a", group: "core",    label: "Fondo general" },
  { dbField: "themeSurface", cookieKey: "surface", cssVar: "--surface",      light: "#ffffff", dark: "#1e293b", group: "core",    label: "Fondo de cards" },
  { dbField: "themeBorder",  cookieKey: "border",  cssVar: "--border",       light: "#e5e7eb", dark: "#334155", group: "core",    label: "Bordes" },
  { dbField: "themeText",    cookieKey: "text",    cssVar: "--text",         light: "#111827", dark: "#f1f5f9", group: "core",    label: "Texto" },
  { dbField: "themePrimary", cookieKey: "primary", cssVar: "--primary",      light: "#15803d", dark: "#22c55e", group: "core",    label: "Color principal" },

  // ── Sidebar (always applied) ───────────────────────────────────────────
  { dbField: "themeSidebarBg",   cookieKey: "sidebarBg",   cssVar: "--sidebar-bg",   light: "#15803d", dark: "#0f172a", group: "sidebar", label: "Fondo barra lateral" },
  { dbField: "themeSidebarText", cookieKey: "sidebarText", cssVar: "--sidebar-text", light: "#ffffff", dark: "#f1f5f9", group: "sidebar", label: "Texto barra lateral" },

  // ── Content types (always applied) ─────────────────────────────────────
  { dbField: "themeKernel",   cookieKey: "kernel",   cssVar: "--kernel",    light: "#15803d", dark: "#22c55e", group: "content", label: "Color Kernel" },
  { dbField: "themeModule",   cookieKey: "module",   cssVar: "--module",    light: "#1d4ed8", dark: "#3b82f6", group: "content", label: "Color Módulo" },
  { dbField: "themeResource", cookieKey: "resource", cssVar: "--resource",  light: "#b45309", dark: "#d97706", group: "content", label: "Color Recurso" },
];

// ── Derived helpers ───────────────────────────────────────────────────────

/** Map DB field → ThemeProperty (O(1) lookup) */
const byDbField = new Map(THEME_PROPERTIES.map((p) => [p.dbField, p]));

/** Map cookie key → ThemeProperty */
const byCookieKey = new Map(THEME_PROPERTIES.map((p) => [p.cookieKey, p]));

/** Build cookie payload from raw DB/config values.
 *  Input keys are dbField names (themeBg, themeKernel, ...).
 *  Output keys are cookieKey names (bg, kernel, ...). */
export function buildThemeCookie(raw: Record<string, string | undefined>): Record<string, string> {
  const cookie: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const prop = byDbField.get(key);
    if (prop && value) cookie[prop.cookieKey] = value;
  }
  return cookie;
}

/** Read cookie payload and return CSS variable overrides + dark mode flag.
 *  Used by layout.tsx server-side. */
export function cookieToStyle(rawCookie: Record<string, string>): {
  htmlStyle: Record<string, string>;
  isDark: boolean;
} {
  const style: Record<string, string> = {};
  let isDark = false;

  for (const [key, value] of Object.entries(rawCookie)) {
    if (key === "mode") {
      isDark = value === "dark";
      continue;
    }
    const prop = byCookieKey.get(key);
    if (prop) {
      style[prop.cssVar] = value;
      // Derivatives
      if (prop.cssVar === "--bg")           { /* no derivative needed */ }
      if (prop.cssVar === "--border")       { style["--border-subtle"] = value; }
      if (prop.cssVar === "--text")         { style["--text-muted"] = value + "cc"; style["--text-subtle"] = value + "88"; }
      if (prop.cssVar === "--primary")      { style["--primary-h"] = value; }
      if (prop.cssVar === "--kernel")       { style["--kernel-h"] = value; }
      if (prop.cssVar === "--module")       { style["--module-h"] = value; }
      if (prop.cssVar === "--resource")     { style["--resource-h"] = value; }
    }
  }

  return { htmlStyle: style, isDark };
}

/** Convenience: get core properties only (for custom mode UI) */
export const CORE_PROPS = THEME_PROPERTIES.filter((p) => p.group === "core");
/** Convenience: sidebar properties */
export const SIDEBAR_PROPS = THEME_PROPERTIES.filter((p) => p.group === "sidebar");
/** Convenience: content type properties */
export const CONTENT_PROPS = THEME_PROPERTIES.filter((p) => p.group === "content");

// ── Presets (typed for backward compat) ────────────────────────────────────
export const PRESET_LIGHT = {
  themeBg:      "#f9fafb",
  themeSurface: "#ffffff",
  themeBorder:  "#e5e7eb",
  themeText:    "#111827",
  themePrimary: "#15803d",
} as const;

export const PRESET_DARK = {
  themeBg:      "#0f172a",
  themeSurface: "#1e293b",
  themeBorder:  "#334155",
  themeText:    "#f1f5f9",
  themePrimary: "#22c55e",
} as const;

// isValidHex lives in lib/theme.ts (alongside the other WCAG utilities).
// Import it from there: import { isValidHex } from "@/lib/theme";
