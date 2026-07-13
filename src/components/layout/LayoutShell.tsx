"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu }        from "lucide-react";
import { Sidebar }     from "@/components/layout/Sidebar";
import { BottomNav }   from "@/components/layout/BottomNav";
import { clearThemeCookies, writeThemeCookie } from "@/lib/theme-cookie-client";

interface Props {
  children:         React.ReactNode;
  isLoggedIn:       boolean;
  /** Encoded cookie value produced by layout.tsx when no cookie existed (first
   *  login / cleared). The client persists it so subsequent page loads use the
   *  fast cookie path instead of hitting the DB again. */
  cookieToHydrate?: string | null;
}

export function LayoutShell({ children, isLoggedIn, cookieToHydrate }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLinus2 = pathname === "/linus-2" || pathname.startsWith("/linus-2/");
  const isDocumentEditor = pathname.split("/").filter(Boolean).length === 3;

  // Guests must never inherit theme state from a previous logged-in user.
  // next-themes persists the chosen theme in localStorage under key "theme".
  // Clear it (and the cookie) so the default light theme always applies.
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.removeItem("theme");
      clearThemeCookies();
    }
  }, [isLoggedIn]);

  // When layout loaded the theme from DB (no cookie present on login),
  // persist it as a cookie so future navigations use the fast path.
  useEffect(() => {
    if (isLoggedIn && cookieToHydrate) {
      writeThemeCookie(cookieToHydrate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — value is stable from SSR

  // Home page gets no top padding on mobile; all others get a tiny bit
  const isHome = pathname === "/" || pathname === "/feed";
  const mobilePt = isHome ? "pt-0" : "pt-3";

  // Guests only see the sidebar after leaving the landing page
  const showSidebar = isLoggedIn || pathname !== "/";

  if (isLinus2) return <>{children}</>;

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
          className="fixed inset-0 z-40 hidden bg-text/40 md:block lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — hidden on mobile (<768px), toggleable on tablet, fixed on desktop ── */}
      {showSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className={`${showSidebar ? "lg:ml-60" : ""} min-h-screen ${isDocumentEditor ? "overflow-x-hidden" : `pb-16 md:pb-0 ${mobilePt} md:pt-14 lg:pt-7 px-4 sm:px-6 overflow-x-hidden`}`}>
        {children}
      </main>

      {/* ── Bottom nav — mobile only (<768px) ───────────────────────────── */}
      <BottomNav />

    </div>
  );
}
