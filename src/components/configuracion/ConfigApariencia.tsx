"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ConfigApariencia() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Apariencia</h2>
        <p className="text-sm text-gray-500 mt-0.5">Cambiá entre el modo claro y oscuro.</p>
      </div>

      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {mounted ? (isDark ? "Modo oscuro" : "Modo claro") : "Tema"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {mounted
              ? (isDark ? "Fondo oscuro, ideal para la noche." : "Fondo claro, ideal para el día.")
              : "Cargando..."}
          </p>
        </div>

        {mounted && (
          /* ── Switcher día/noche ── */
          <div
            className={`group relative w-60 h-20 overflow-hidden rounded-full
              transition-colors duration-300 shrink-0
              shadow-[inset_-6px_-6px_10px_rgba(0,0,0,0.18),inset_4px_4px_20px_rgba(5,5,5,0.4)]
              ${isDark ? "bg-neutral-950" : "bg-sky-400"}`}
          >
            {/* Textura cielo/estrellas */}
            <img
              src="https://i.ibb.co/LDkGgcfN/Untitled-design.png"
              alt=""
              className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover opacity-70"
            />
            <label className="relative z-20 block h-full w-full cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isDark}
                onChange={e => setTheme(e.target.checked ? "dark" : "light")}
              />
              {/* Bolita deslizante */}
              <span className={`absolute left-2 top-1 h-18 w-18 transition-transform duration-300 ${isDark ? "translate-x-38" : "translate-x-0"}`}>
                {/* Halos de luz */}
                <span className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/10 blur-[1px]" />
                <span className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/15 blur-[1px]" />
                <span className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-200/20" />
                <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-100/20" />
                {/* Sol / Luna */}
                <span className={`relative block h-18 w-18 overflow-hidden rounded-full drop-shadow-[1px_1px_3px_black] transition-colors duration-300 ${isDark ? "bg-blue-200" : "bg-yellow-400"}`}>
                  <img
                    src="https://i.ibb.co/7hjWjFP/Untitled-design-8.png"
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isDark ? "opacity-50" : "opacity-0"}`}
                  />
                  <span className={`pointer-events-none absolute inset-0 rounded-full transition-shadow duration-300 ${isDark
                    ? "shadow-[inset_-6px_-6px_10px_rgba(0,0,0,0.12),inset_4px_4px_8px_rgba(255,255,255,0.55)]"
                    : "shadow-[inset_-6px_-6px_10px_rgba(0,0,0,0.18),inset_4px_4px_8px_rgba(255,255,255,0.45)]"}`}
                  />
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
