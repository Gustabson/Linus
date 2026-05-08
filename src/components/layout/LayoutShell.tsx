"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu }        from "lucide-react";
import { Sidebar }     from "@/components/layout/Sidebar";
import { BottomNav }   from "@/components/layout/BottomNav";

interface Props {
  children:    React.ReactNode;
  isLoggedIn:  boolean;
}

export function LayoutShell({ children, isLoggedIn }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Guests must never inherit theme state from a previous logged-in user.
  // next-themes persists the chosen theme in localStorage under key "theme".
  // Clear it (and the cookie) so the default light theme always applies.
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.removeItem("theme");
      document.cookie = "eduhub_theme=;path=/;max-age=0";
    }
  }, [isLoggedIn]);

  // Home page gets no top padding on mobile; all others get a tiny bit
  const isHome = pathname === "/" || pathname === "/feed";
  const mobilePt = isHome ? "pt-0" : "pt-3";

  // Guests only see the sidebar after leaving the landing page
  const showSidebar = isLoggedIn || pathname !== "/";

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Hamburger button — tablet only (768px–1023px) ──────────────── */}
      {showSidebar && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:bg-bg transition-colors hidden md:flex lg:hidden shadow-sm"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ── Sidebar overlay backdrop — tablet only ──────────────────────── */}
      {showSidebar && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 hidden md:block lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — hidden on mobile (<768px), toggleable on tablet, fixed on desktop ── */}
      {showSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className={`${showSidebar ? "lg:ml-64" : ""} min-h-screen pb-16 md:pb-0 ${mobilePt} md:pt-14 lg:pt-6 px-4 sm:px-6 overflow-x-hidden`}>
        {children}
      </main>

      {/* ── Bottom nav — mobile only (<768px) ───────────────────────────── */}
      <BottomNav />

    </div>
  );
}
