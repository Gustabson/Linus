import { Cpu, Puzzle, Package } from "lucide-react";
import type { ContentType } from "@prisma/client";

/**
 * Badge definitions for each content type — label, Tailwind colour classes, and a small icon.
 * Used in dashboard, explorar, and profile pages.
 */
export const CONTENT_TYPE_BADGE: Record<
  ContentType,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  KERNEL:   { label: "Kernel",  cls: "bg-green-100 text-green-800",  icon: <Cpu className="w-3 h-3" />     },
  MODULE:   { label: "Módulo",  cls: "bg-blue-100 text-blue-800",    icon: <Puzzle className="w-3 h-3" />  },
  RESOURCE: { label: "Recurso", cls: "bg-amber-100 text-amber-800",  icon: <Package className="w-3 h-3" /> },
};

/**
 * Tab definitions for the three content types — used in dashboard and explorar.
 */
export const CONTENT_TABS: {
  key: ContentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { key: "KERNEL",   label: "Kernels",  icon: <Cpu className="w-4 h-4" />,     color: "green" },
  { key: "MODULE",   label: "Módulos",  icon: <Puzzle className="w-4 h-4" />,  color: "blue"  },
  { key: "RESOURCE", label: "Recursos", icon: <Package className="w-4 h-4" />, color: "amber" },
];
