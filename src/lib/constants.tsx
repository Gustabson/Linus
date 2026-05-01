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
    badgeCls:          "bg-kernel/10 text-kernel",
    ringCls:           "focus:ring-kernel",
    borderCls:         "border-kernel/30",
    accentBorderCls:   "border-kernel",
    btnCls:            "bg-kernel hover:bg-kernel-h text-white",
    lightBgCls:        "bg-kernel/8",
    textCls:           "text-kernel",
    iconBgCls:         "bg-kernel/10 text-kernel",
    progressCls:       "bg-kernel",
    hoverTextCls:      "hover:text-kernel",
    hoverBorderCls:    "hover:border-kernel/30",
    groupHoverTextCls: "group-hover:text-kernel",
    gradientCls:       "from-kernel/5 to-transparent",
    icon:              <Cpu     className="w-4 h-4" />,
    iconLg:            <Cpu     className="w-5 h-5" />,
  },
  MODULE: {
    label:             "Módulo",
    badgeCls:          "bg-module/10 text-module",
    ringCls:           "focus:ring-module",
    borderCls:         "border-module/30",
    accentBorderCls:   "border-module",
    btnCls:            "bg-module hover:bg-module-h text-white",
    lightBgCls:        "bg-module/8",
    textCls:           "text-module",
    iconBgCls:         "bg-module/10 text-module",
    progressCls:       "bg-module",
    hoverTextCls:      "hover:text-module",
    hoverBorderCls:    "hover:border-module/30",
    groupHoverTextCls: "group-hover:text-module",
    gradientCls:       "from-module/5 to-transparent",
    icon:              <Puzzle  className="w-4 h-4" />,
    iconLg:            <Puzzle  className="w-5 h-5" />,
  },
  RESOURCE: {
    label:             "Recurso",
    badgeCls:          "bg-resource/10 text-resource",
    ringCls:           "focus:ring-resource",
    borderCls:         "border-resource/30",
    accentBorderCls:   "border-resource",
    btnCls:            "bg-resource hover:bg-resource-h text-white",
    lightBgCls:        "bg-resource/8",
    textCls:           "text-resource",
    iconBgCls:         "bg-resource/10 text-resource",
    progressCls:       "bg-resource",
    hoverTextCls:      "hover:text-resource",
    hoverBorderCls:    "hover:border-resource/30",
    groupHoverTextCls: "group-hover:text-resource",
    gradientCls:       "from-resource/5 to-transparent",
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

/** Placeholder for new-document name input inside a Kernel */
export const KERNEL_DOC_PLACEHOLDER = "Ej: Introducción, Unidad 1, Clase 3…";

/** Label for the action button that creates a doc inside a Kernel */
export const KERNEL_NEW_DOC_LABEL = "Nuevo documento";
