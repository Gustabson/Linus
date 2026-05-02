"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu }        from "lucide-react";
import { Navbar }      from "@/components/layout/Navbar";
import { Sidebar }     from "@/components/layout/Sidebar";
import { BottomNav }   from "@/components/layout/BottomNav";

interface Props {
  children:    React.ReactNode;
  isLoggedIn:  boolean;
}

export function LayoutShell({ children, isLoggedIn }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (!isLoggedIn) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </>
    );
  }

  // Home page gets no top padding on mobile; all others get a tiny bit
  const isHome = pathname === "/";
  const mobilePt = isHome ? "pt-0" : "pt-3";

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Hamburger button — tablet only (768px–1023px) ──────────────── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:bg-bg transition-colors hidden md:flex lg:hidden shadow-sm"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Sidebar overlay backdrop — tablet only ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 hidden md:block lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — hidden on mobile (<768px), toggleable on tablet, fixed on desktop ── */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className={`lg:ml-64 min-h-screen pb-16 md:pb-0 ${mobilePt} md:pt-14 lg:pt-6 px-4 sm:px-6`}>
        {children}
      </main>

      {/* ── Bottom nav — mobile only (<768px) ───────────────────────────── */}
      <BottomNav />

    </div>
  );
}
