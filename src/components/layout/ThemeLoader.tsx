"use client";

import { useEffect } from "react";

const COOKIE_NAME = "eduhub_theme";

interface ThemeCookie {
  mode?: string;
  bg?: string;
  surface?: string;
  border?: string;
  text?: string;
  primary?: string;
  sidebarBg?: string;
  sidebarText?: string;
  kernel?: string;
  module?: string;
  resource?: string;
}

export function ThemeLoader() {
  useEffect(() => {
    try {
      const raw = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COOKIE_NAME}=`))
        ?.split("=")[1];

      if (!raw) return;
      const t: ThemeCookie = JSON.parse(decodeURIComponent(raw));

      const root = document.documentElement;

      // Dark mode
      if (t.mode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // Custom colors (only if mode is custom or explicit colors set)
      if (t.bg)      root.style.setProperty("--bg", t.bg);
      if (t.surface) root.style.setProperty("--surface", t.surface);
      if (t.border)  {
        root.style.setProperty("--border", t.border);
        root.style.setProperty("--border-subtle", t.border);
      }
      if (t.text)    {
        root.style.setProperty("--text", t.text);
        root.style.setProperty("--text-muted", t.text + "cc");
        root.style.setProperty("--text-subtle", t.text + "88");
      }
      if (t.primary) {
        root.style.setProperty("--primary", t.primary);
        root.style.setProperty("--primary-h", t.primary);
      }
      if (t.sidebarBg)   root.style.setProperty("--sidebar-bg", t.sidebarBg);
      if (t.sidebarText) root.style.setProperty("--sidebar-text", t.sidebarText);
      if (t.kernel)      { root.style.setProperty("--kernel", t.kernel); root.style.setProperty("--kernel-h", t.kernel); }
      if (t.module)      { root.style.setProperty("--module", t.module); root.style.setProperty("--module-h", t.module); }
      if (t.resource)    { root.style.setProperty("--resource", t.resource); root.style.setProperty("--resource-h", t.resource); }
    } catch { /* cookie inválida, ignorar */ }
  }, []);

  return null; // no renderiza nada
}
