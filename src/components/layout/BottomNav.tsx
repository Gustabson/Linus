"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Home, LayoutDashboard, Mail, Search, Compass, GitPullRequest,
  Settings, User, Bell, X,
} from "lucide-react";

// ── BottomNav: visible only on mobile (<768px) ────────────────────────────
// Styled with sidebar colors (--sidebar-bg / --sidebar-text) so user
// theme customizations apply to the mobile bar too.
//
// 4 items: Inicio | Mi espacio (modal) | Correos | Configuración (modal)
// Mi espacio modal → Mi espacio, Explorar, Buscar, Propuestas
// Configuración modal → Perfil, Notificaciones, Configuración

const POLL_MS = 60_000;

function useBottomBadges() {
  const [correos, setCorreos] = useState(0);
  const [propuestas, setPropuestas] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchBadges = useCallback(async () => {
    try {
      const [c, p, n] = await Promise.all([
        fetch("/api/correos/no-leidos").then((r) => r.ok ? r.json() : { count: 0 }),
        fetch("/api/proposals/pending").then((r) => r.ok ? r.json() : { count: 0 }),
        fetch("/api/notifications").then((r) => r.ok ? r.json() : { unreadCount: 0 }),
      ]);
      setCorreos(c.count ?? 0);
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

  return { correos, propuestas, unreadNotifications };
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-3 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Modal wrapper (bottom sheet) ──────────────────────────────────────────
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
      <div
        className="fixed inset-0 bg-black/40 z-50 md:hidden"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar-bg rounded-t-2xl shadow-xl md:hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-sidebar-text/20">
          <h3 className="text-base font-semibold text-sidebar-text">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-sidebar-text/10 text-sidebar-text/70 hover:text-sidebar-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
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
      className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium text-sidebar-text/80 hover:bg-sidebar-text/10 hover:text-sidebar-text transition-colors"
    >
      <Icon className="w-5 h-5 shrink-0 text-sidebar-text/60" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[1.25rem] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ── Sidebar-style helpers ──────────────────────────────────────────────────
const ACTIVE   = "text-sidebar-text bg-sidebar-text/15 rounded-xl";
const INACTIVE = "text-sidebar-text/60 hover:text-sidebar-text hover:bg-sidebar-text/10 rounded-xl";

// ── Main component ─────────────────────────────────────────────────────────
export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { correos, propuestas, unreadNotifications } = useBottomBadges();

  const [miEspacioOpen, setMiEspacioOpen] = useState(false);
  const [configOpen, setConfigOpen]       = useState(false);

  const profileHref = session?.user?.username
    ? `/${session.user.username}`
    : "/bienvenida";

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const mainActive    = isActive("/");
  const espacioActive = isActive("/dashboard") || isActive("/explorar") || isActive("/buscar") || isActive("/propuestas");
  const correosActive = isActive("/correos");
  const configActive  = isActive("/configuracion") || isActive("/notificaciones");

  // Combine correos + propuestas for the Mi espacio badge
  const espacioBadge = correos + propuestas;

  return (
    <>
      {/* ── Bottom tab bar ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar-bg md:hidden safe-area-bottom rounded-t-xl">
        <div className="flex items-stretch h-14 px-1 gap-0.5">
          {/* Inicio */}
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              mainActive ? ACTIVE : INACTIVE
            }`}
          >
            <Home className={`w-5 h-5 ${mainActive ? "fill-sidebar-text/15" : ""}`} />
            Inicio
          </Link>

          {/* Mi espacio — opens modal */}
          <button
            onClick={() => setMiEspacioOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative ${
              espacioActive ? ACTIVE : INACTIVE
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${espacioActive ? "fill-sidebar-text/15" : ""}`} />
            Espacio
            {propuestas > 0 && <Badge count={propuestas} />}
          </button>

          {/* Correos */}
          <Link
            href="/correos"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative ${
              correosActive ? ACTIVE : INACTIVE
            }`}
          >
            <Mail className={`w-5 h-5 ${correosActive ? "fill-sidebar-text/15" : ""}`} />
            Correos
            {correos > 0 && <Badge count={correos} />}
          </Link>

          {/* Configuración — opens modal */}
          <button
            onClick={() => setConfigOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative ${
              configActive ? ACTIVE : INACTIVE
            }`}
          >
            <Settings className={`w-5 h-5 ${configActive ? "fill-sidebar-text/15" : ""}`} />
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
