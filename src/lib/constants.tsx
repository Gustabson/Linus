import { Cpu, Puzzle, Package } from "lucide-react";
import type { ContentType } from "@prisma/client";

// ─── Content-type style system ────────────────────────────────────────────────
// Single source of truth. Every page that needs colors, labels or icons for
// KERNEL / MODULE / RESOURCE imports from here — no hardcoded strings elsewhere.
//
// Uses a factory so adding a new type = 1 call to buildTypeStyle().
// CSS variables (--kernel, --module, --resource) are defined in globals.css
// and overridable via user theme preferences.

export type ContentTypeStyle = {
  label:            string;
  badgeCls:         string;  // small badge: bg + text
  ringCls:          string;  // focus ring
  borderCls:        string;  // light border
  accentBorderCls:  string;  // strong/active border
  btnCls:           string;  // solid button
  lightBgCls:       string;  // light background
  textCls:          string;  // text accent
  iconBgCls:        string;  // icon container bg + text
  progressCls:      string;  // progress bar fill
  hoverTextCls:     string;
  hoverBorderCls:   string;
  groupHoverTextCls: string;
  gradientCls:      string;  // header gradient
  icon:             React.ReactNode;
  iconLg:           React.ReactNode;
};

/** Factory: builds a ContentTypeStyle from a CSS variable prefix + icon */
function buildTypeStyle(
  label: string,
  cssVar: string,        // e.g. "kernel" → uses --kernel CSS var
  Icon: React.ElementType,
): ContentTypeStyle {
  const t = cssVar;
  return {
    label,
    badgeCls:          `bg-${t}/10 text-${t}`,
    ringCls:           `focus:ring-${t}`,
    borderCls:         `border-${t}/30`,
    accentBorderCls:   `border-${t}`,
    btnCls:            `bg-${t} hover:bg-${t}-h text-white`,
    lightBgCls:        `bg-${t}/8`,
    textCls:           `text-${t}`,
    iconBgCls:         `bg-${t}/10 text-${t}`,
    progressCls:       `bg-${t}`,
    hoverTextCls:      `hover:text-${t}`,
    hoverBorderCls:    `hover:border-${t}/30`,
    groupHoverTextCls: `group-hover:text-${t}`,
    gradientCls:       `from-${t}/5 to-transparent`,
    icon:              <Icon className="w-4 h-4" />,
    iconLg:            <Icon className="w-5 h-5" />,
  };
}

export const CONTENT_TYPE_STYLE: Record<ContentType, ContentTypeStyle> = {
  KERNEL:   buildTypeStyle("Kernel",   "kernel",   Cpu),
  MODULE:   buildTypeStyle("Módulo",   "module",   Puzzle),
  RESOURCE: buildTypeStyle("Recurso",  "resource", Package),
};

export const CONTENT_TABS: {
  key: ContentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { key: "KERNEL",   label: "Kernels",  icon: <Cpu     className="w-4 h-4" />, color: "green" },
  { key: "MODULE",   label: "Módulos",  icon: <Puzzle  className="w-4 h-4" />, color: "blue"  },
  { key: "RESOURCE", label: "Recursos", icon: <Package className="w-4 h-4" />, color: "amber" },
];

// ─── Document naming helpers ──────────────────────────────────────────────────
export const KERNEL_DOC_PLACEHOLDER = "Ej: Introducción, Unidad 1, Clase 3…";
export const KERNEL_NEW_DOC_LABEL = "Nuevo documento";

export const QUICK_EMOJIS = [
  "😊", "👍", "❤️", "🎉", "🙏", "😂", "🔥", "✅", "⭐", "💡",
  "📚", "✏️", "🧠", "🎓", "💪", "📖", "📝", "🤔", "🚀", "🌟",
];
