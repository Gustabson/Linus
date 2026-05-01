"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";

export function ConfigApariencia() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <SectionCard
      title="Apariencia"
      description="Cambiá entre el modo claro y oscuro."
    >
      {mounted && (
        <div className="flex items-center gap-2 p-1 bg-bg rounded-xl border border-border w-fit">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !isDark
                ? "bg-surface shadow-sm text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Sun className="w-4 h-4" />
            Claro
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isDark
                ? "bg-surface shadow-sm text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Moon className="w-4 h-4" />
            Oscuro
          </button>
        </div>
      )}
    </SectionCard>
  );
}
