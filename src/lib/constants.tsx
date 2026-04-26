import { Cpu, Puzzle, Package } from "lucide-react";
import type { ContentType } from "@prisma/client";

// ─── Content-type style system ────────────────────────────────────────────────
// Single source of truth. Every page that needs colors, labels or icons for
// KERNEL / MODULE / RESOURCE imports from here — no hardcoded strings elsewhere.

export type ContentTypeStyle = {
  label:            string;
  /** Small badge: bg + text, e.g. "bg-green-100 text-green-800" */
  badgeCls:         string;
  /** Ring / focus / active accent, e.g. "focus:ring-green-500" */
  ringCls:          string;
  /** Light border accent, e.g. "border-green-300" */
  borderCls:        string;
  /** Strong border accent for active/selected states, e.g. "border-green-500" */
  accentBorderCls:  string;
  /** Solid button bg, e.g. "bg-green-700 hover:bg-green-800 text-white" */
  btnCls:           string;
  /** Light background, e.g. "bg-green-50" */
  lightBgCls:       string;
  /** Text accent, e.g. "text-green-700" */
  textCls:          string;
  /** Icon container bg + text, e.g. "bg-green-100 text-green-700" */
  iconBgCls:        string;
  /** Progress bar fill, e.g. "bg-green-500" */
  progressCls:         string;
  /** Hover text, e.g. "hover:text-green-700" */
  hoverTextCls:        string;
  /** Hover border, e.g. "hover:border-green-300" */
  hoverBorderCls:      string;
  /** Group-hover text, e.g. "group-hover:text-green-700" */
  groupHoverTextCls:   string;
  /** Header gradient strip, e.g. "from-green-50 to-white" */
  gradientCls:      string;
  /** Small icon (16×16) */
  icon:             React.ReactNode;
  /** Larger icon (20×20) */
  iconLg:           React.ReactNode;
};

export const CONTENT_TYPE_STYLE: Record<ContentType, ContentTypeStyle> = {
  KERNEL: {
    label:             "Kernel",
    badgeCls:          "bg-green-100 text-green-800",
    ringCls:           "focus:ring-green-500",
    borderCls:         "border-green-300",
    accentBorderCls:   "border-green-500",
    btnCls:            "bg-green-700 hover:bg-green-800 text-white",
    lightBgCls:        "bg-green-50",
    textCls:           "text-green-700",
    iconBgCls:         "bg-green-100 text-green-700",
    progressCls:       "bg-green-500",
    hoverTextCls:      "hover:text-green-700",
    hoverBorderCls:    "hover:border-green-300",
    groupHoverTextCls: "group-hover:text-green-700",
    gradientCls:       "from-green-50 to-white",
    icon:              <Cpu     className="w-4 h-4" />,
    iconLg:            <Cpu     className="w-5 h-5" />,
  },
  MODULE: {
    label:             "Módulo",
    badgeCls:          "bg-blue-100 text-blue-800",
    ringCls:           "focus:ring-blue-500",
    borderCls:         "border-blue-300",
    accentBorderCls:   "border-blue-500",
    btnCls:            "bg-blue-700 hover:bg-blue-800 text-white",
    lightBgCls:        "bg-blue-50",
    textCls:           "text-blue-700",
    iconBgCls:         "bg-blue-100 text-blue-700",
    progressCls:       "bg-blue-500",
    hoverTextCls:      "hover:text-blue-700",
    hoverBorderCls:    "hover:border-blue-300",
    groupHoverTextCls: "group-hover:text-blue-700",
    gradientCls:       "from-blue-50 to-white",
    icon:              <Puzzle  className="w-4 h-4" />,
    iconLg:            <Puzzle  className="w-5 h-5" />,
  },
  RESOURCE: {
    label:             "Recurso",
    badgeCls:          "bg-amber-100 text-amber-800",
    ringCls:           "focus:ring-amber-500",
    borderCls:         "border-amber-300",
    accentBorderCls:   "border-amber-500",
    btnCls:            "bg-amber-700 hover:bg-amber-800 text-white",
    lightBgCls:        "bg-amber-50",
    textCls:           "text-amber-700",
    iconBgCls:         "bg-amber-100 text-amber-700",
    progressCls:       "bg-amber-500",
    hoverTextCls:      "hover:text-amber-700",
    hoverBorderCls:    "hover:border-amber-300",
    groupHoverTextCls: "group-hover:text-amber-700",
    gradientCls:       "from-amber-50 to-white",
    icon:              <Package className="w-4 h-4" />,
    iconLg:            <Package className="w-5 h-5" />,
  },
};

// ─── Legacy aliases (backwards-compat for existing imports) ──────────────────

/** @deprecated Use CONTENT_TYPE_STYLE[type].badgeCls + label + icon */
export const CONTENT_TYPE_BADGE: Record<
  ContentType,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  KERNEL:   { label: "Kernel",  cls: CONTENT_TYPE_STYLE.KERNEL.badgeCls,   icon: <Cpu     className="w-3 h-3" /> },
  MODULE:   { label: "Módulo",  cls: CONTENT_TYPE_STYLE.MODULE.badgeCls,   icon: <Puzzle  className="w-3 h-3" /> },
  RESOURCE: { label: "Recurso", cls: CONTENT_TYPE_STYLE.RESOURCE.badgeCls, icon: <Package className="w-3 h-3" /> },
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

/** What to call the "units" inside a Kernel */
export const KERNEL_DOC_PLACEHOLDER = "Ej: Unidad 1, Clase 3, Módulo de introducción…";

/** Label for the action button that creates a doc inside a Kernel */
export const KERNEL_NEW_DOC_LABEL = "Nueva unidad";
