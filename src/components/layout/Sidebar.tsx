"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useCallback, useState } from "react";
import {
  Home, LayoutDashboard, Search, Compass,
  Mail, Settings, LogOut, AlertCircle, MessageSquareText,
} from "lucide-react";
import Image from "next/image";
import { LinugMark } from "@/components/brand/LinugMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { clearThemeCookies } from "@/lib/theme-cookie-client";

const POLL_MS = 180_000; // 3 min — badge counts don't need real-time

// ── Sidebar badge counts (correos + propuestas) ────────────────────────────
function useSidebarCounts() {
  const { data: session }        = useSession();
  const [correos,   setCorroes]   = useState(0);
  const [propuestas, setPropuestas] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!session) return;
    try {
      const [c, p] = await Promise.all([
        fetch("/api/correos/no-leidos").then((r) => r.ok ? r.json() : { count: 0 }),
        fetch("/api/proposals/pending").then((r) => r.ok ? r.json() : { count: 0 }),
      ]);
      setCorroes(c.count ?? 0);
      setPropuestas(p.count ?? 0);
    } catch { /* ignore */ }
  }, [session]);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, POLL_MS);
    function onVisible() { if (document.visibilityState === "visible") fetchCounts(); }
    function onCorreoRead() { fetchCounts(); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("correos:read", onCorreoRead);
    window.addEventListener("proposals:read", onCorreoRead);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("correos:read", onCorreoRead);
      window.removeEventListener("proposals:read", onCorreoRead);
    };
  }, [fetchCounts]);

  return { correos, propuestas };
}

// ── Small pill badge ───────────────────────────────────────────────────────
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-primary-fg">
      {count > 99 ? "99+" : count}
    </span>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname           = usePathname();
  const { data: session }  = useSession();
  const { correos, propuestas } = useSidebarCounts();

  const isLoggedIn    = !!session;
  const username      = session?.user?.username;
  const profileHref   = username ? `/${username}` : "/bienvenida";
  const needsUsername = isLoggedIn && !username;

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const itemCls = (href: string) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive(href)
        ? "bg-sidebar-text/15 text-sidebar-text shadow-sm ring-1 ring-inset ring-sidebar-text/10"
        : "text-sidebar-text/70 hover:bg-sidebar-text/10 hover:text-sidebar-text"
    }`;

  const NAV_ITEMS: { href: string; icon: React.ElementType; label: string; badge?: number }[] = [
    { href: isLoggedIn ? "/" : "/feed", icon: Home, label: "Inicio" },
    { href: "/dashboard",  icon: LayoutDashboard, label: "Mi espacio" },
    { href: "/explorar",   icon: Compass,         label: "Explorar"   },
    { href: "/buscar",     icon: Search,          label: "Buscar"     },
    { href: "/propuestas", icon: MessageSquareText, label: "Propuestas", badge: propuestas },
    { href: "/correos",    icon: Mail,            label: "Correos",    badge: correos    },
  ];

  return (
    <aside
      className={
        "fixed left-0 top-0 h-screen w-60 bg-sidebar-bg flex-col z-50 transition-transform duration-300 ease-in-out " +
        // Mobile (<768px): completely hidden (display:none)
        "hidden md:flex " +
        // Desktop (≥1024px): always visible
        "lg:translate-x-0 " +
        // Tablet (768–1023px): controlled by open prop
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="border-b border-sidebar-text/20 px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-sidebar-text font-bold text-xl" onClick={onClose}>
          <LinugMark className="h-8 w-8 shrink-0" />
          <span className="tracking-[-0.035em]">LINUG</span>
        </Link>
      </div>

      {/* ── Username banner ──────────────────────────────────── */}
      {needsUsername && (
        <div className="mx-3 mt-3 bg-amber-400/20 border border-amber-300/30 rounded-xl px-3 py-2.5 space-y-1.5">
          <p className="text-amber-200 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Elegí tu nombre de usuario
          </p>
          <Link href="/bienvenida" className="text-xs font-semibold text-sidebar-text underline hover:no-underline" onClick={onClose}>
            Configurar ahora →
          </Link>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href} prefetch={true} className={itemCls(href)} onClick={onClose}>
            <Icon className="w-5 h-5 shrink-0" />
            {label}
            <NavBadge count={badge ?? 0} />
          </Link>
        ))}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 border-t border-sidebar-text/20 pt-3 space-y-1">

        {isLoggedIn ? (
          <>
            {/* Notificaciones */}
            <NotificationBell
              href="/notificaciones"
              triggerClass={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive("/notificaciones")
                  ? "bg-sidebar-text/15 text-sidebar-text shadow-sm ring-1 ring-inset ring-sidebar-text/10"
                  : "text-sidebar-text/70 hover:bg-sidebar-text/10 hover:text-sidebar-text"
              }`}
              label="Notificaciones"
            />

            {/* Configuración */}
            <Link
              href="/configuracion"
              className={itemCls("/configuracion")}
              onClick={onClose}
            >
              <Settings className="w-5 h-5 shrink-0" />
              Configuración
            </Link>

            {/* Perfil */}
            <Link
              href={profileHref}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                username && pathname === `/${username}`
                  ? "bg-sidebar-text/15 text-sidebar-text"
                  : "text-sidebar-text/70 hover:bg-sidebar-text/10 hover:text-sidebar-text"
              }`}
              onClick={onClose}
            >
              {session?.user?.image ? (
                <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-sidebar-text/20 flex items-center justify-center text-sidebar-text text-xs font-bold shrink-0">
                  {(session?.user?.name ?? "?")[0]}
                </div>
              )}
              <span className="truncate">{session?.user?.name?.split(" ")[0] ?? "Perfil"}</span>
            </Link>

            {/* Cerrar sesión */}
            <button
              onClick={() => { clearThemeCookies(); localStorage.removeItem("theme"); signOut(); }}
              className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-text/60 hover:bg-sidebar-text/10 hover:text-sidebar-text transition-all"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            {/* Configuración (accesible sin cuenta) */}
            <Link
              href="/configuracion"
              className={itemCls("/configuracion")}
              onClick={onClose}
            >
              <Settings className="w-5 h-5 shrink-0" />
              Configuración
            </Link>

            {/* Iniciar sesión / Crear cuenta */}
            <div className="pt-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-h"
              >
                Iniciar sesión / Registrarse
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
