"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Home, LayoutDashboard, Search, Compass, GitPullRequest,
  Settings, User, Bell, X,
} from "lucide-react";

// ── BottomNav: visible only on mobile (<768px) ────────────────────────────
// 3 items: Inicio | Mi espacio (modal) | Configuración (modal)
// Mi espacio modal → Mi espacio, Explorar, Buscar, Propuestas
// Configuración modal → Perfil, Notificaciones, Configuración

const POLL_MS = 60_000;

function useBottomBadges() {
  const [propuestas, setPropuestas] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchBadges = useCallback(async () => {
    try {
      const [p, n] = await Promise.all([
        fetch("/api/proposals/pending").then((r) => r.ok ? r.json() : { count: 0 }),
        fetch("/api/notifications").then((r) => r.ok ? r.json() : { unreadCount: 0 }),
      ]);
      setPropuestas(p.count ?? 0);
      setUnreadNotifications(n.unreadCount ?? 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchBadges();
    const id = setInterval(fetchBadges, POLL_MS);
    function onVisible() { if (document.visibilityState === "visible") fetchBadges(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [fetchBadges]);

  return { propuestas, unreadNotifications };
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-3 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Modal wrapper (bottom sheet style) ──────────────────────────────────────
function BottomModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl shadow-xl md:hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border-subtle">
          <h3 className="text-base font-semibold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-bg text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <div className="px-3 py-3 pb-6 space-y-1">
          {children}
        </div>
      </div>
    </>
  );
}

function ModalLink({
  href,
  icon: Icon,
  label,
  badge,
  onClose,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium text-text hover:bg-bg transition-colors"
    >
      <Icon className="w-5 h-5 shrink-0 text-text-muted" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[1.25rem] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { propuestas, unreadNotifications } = useBottomBadges();

  const [miEspacioOpen, setMiEspacioOpen] = useState(false);
  const [configOpen, setConfigOpen]       = useState(false);

  const profileHref = session?.user?.username
    ? `/${session.user.username}`
    : "/bienvenida";

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const mainActive   = isActive("/");
  const activeColor  = "text-primary";
  const defaultColor = "text-text-subtle hover:text-text-muted";

  return (
    <>
      {/* ── Bottom tab bar ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-stretch h-14">
          {/* Inicio */}
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              mainActive ? activeColor : defaultColor
            }`}
          >
            <Home className={`w-5 h-5 ${mainActive ? "fill-primary/15" : ""}`} />
            Inicio
          </Link>

          {/* Mi espacio — opens modal */}
          <button
            onClick={() => setMiEspacioOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative ${
              isActive("/dashboard") || isActive("/explorar") || isActive("/buscar") || isActive("/propuestas")
                ? activeColor
                : defaultColor
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${isActive("/dashboard") || isActive("/explorar") || isActive("/buscar") || isActive("/propuestas") ? "fill-primary/15" : ""}`} />
            Mi espacio
            {propuestas > 0 && <Badge count={propuestas} />}
          </button>

          {/* Configuración — opens modal */}
          <button
            onClick={() => setConfigOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative ${
              isActive("/configuracion") || isActive("/notificaciones")
                ? activeColor
                : defaultColor
            }`}
          >
            <Settings className={`w-5 h-5 ${isActive("/configuracion") || isActive("/notificaciones") ? "fill-primary/15" : ""}`} />
            Config.
            {unreadNotifications > 0 && <Badge count={unreadNotifications} />}
          </button>
        </div>
      </nav>

      {/* ── Mi espacio modal ─────────────────────────────────────────────── */}
      <BottomModal
        open={miEspacioOpen}
        onClose={() => setMiEspacioOpen(false)}
        title="Mi espacio"
      >
        <ModalLink href="/dashboard"  icon={LayoutDashboard} label="Mi espacio"  onClose={() => setMiEspacioOpen(false)} />
        <ModalLink href="/explorar"   icon={Compass}         label="Explorar"    onClose={() => setMiEspacioOpen(false)} />
        <ModalLink href="/buscar"     icon={Search}          label="Buscar"      onClose={() => setMiEspacioOpen(false)} />
        <ModalLink href="/propuestas" icon={GitPullRequest}  label="Propuestas"  badge={propuestas} onClose={() => setMiEspacioOpen(false)} />
      </BottomModal>

      {/* ── Configuración modal ──────────────────────────────────────────── */}
      <BottomModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configuración"
      >
        <ModalLink href={profileHref}        icon={User}     label="Perfil"          onClose={() => setConfigOpen(false)} />
        <ModalLink href="/notificaciones"   icon={Bell}     label="Notificaciones"  badge={unreadNotifications} onClose={() => setConfigOpen(false)} />
        <ModalLink href="/configuracion"    icon={Settings} label="Configuración"   onClose={() => setConfigOpen(false)} />
      </BottomModal>
    </>
  );
}
