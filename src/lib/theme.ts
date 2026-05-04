/**
 * Theme utilities: WCAG contrast, hex validation, CSS generation.
 * 
 * For theme PROPERTIES (colors, mappings, cookie logic), see:
 *   lib/theme-config.ts  ← SINGLE SOURCE OF TRUTH
 */

// Re-export from theme-config (single source of truth)
export { PRESET_LIGHT, PRESET_DARK, buildThemeCookie, THEME_PROPERTIES, cookieToStyle } from "./theme-config";

export interface CustomTheme {
  themeBg:      string;
  themeSurface: string;
  themeBorder:  string;
  themeText:    string;
  themePrimary: string;
}

/** Valida que un string sea un color hex (#rrggbb) */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/** Luminancia relativa WCAG */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste entre dos colores (WCAG) */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Mínimo aceptable: 3:1 (WCAG AA Large).
 * Devuelve null si es válido, o un mensaje de error si no.
 */
export function validateTheme(t: CustomTheme): string | null {
  const pairs: [string, string, string][] = [
    [t.themeText, t.themeBg,      "Texto sobre fondo general"],
    [t.themeText, t.themeSurface, "Texto sobre fondo de cards"],
  ];
  for (const [fg, bg, label] of pairs) {
    if (!isValidHex(fg) || !isValidHex(bg)) continue;
    if (contrastRatio(fg, bg) < 3) {
      return `${label}: contraste insuficiente (mínimo 3:1). El texto quedaría ilegible.`;
    }
  }
  return null;
}

/** Genera el bloque CSS con los tokens del tema personalizado */
export function buildCustomThemeCSS(t: Partial<CustomTheme>): string {
  const vars: string[] = [];
  if (t.themeBg      && isValidHex(t.themeBg))      vars.push(`--bg: ${t.themeBg};`);
  if (t.themeSurface && isValidHex(t.themeSurface))  vars.push(`--surface: ${t.themeSurface};`);
  if (t.themeBorder  && isValidHex(t.themeBorder))   vars.push(`--border: ${t.themeBorder};`);
  if (t.themeText    && isValidHex(t.themeText))     vars.push(`--text: ${t.themeText}; --text-muted: ${t.themeText}cc; --text-subtle: ${t.themeText}88;`);
  if (t.themePrimary && isValidHex(t.themePrimary))  vars.push(`--primary: ${t.themePrimary}; --primary-h: ${t.themePrimary};`);
  if (vars.length === 0) return "";
  return `:root { ${vars.join(" ")} }`;
}
