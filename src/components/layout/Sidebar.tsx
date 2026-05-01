"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  BookOpen, Home, LayoutDashboard, Search, Compass,
  Plus, Settings, LogOut, AlertCircle, GitPullRequest,
} from "lucide-react";
import Image from "next/image";
import { NotificationBell } from "@/components/layout/NotificationBell";

const NAV_ITEMS = [
  { href: "/",            icon: Home,            label: "Inicio"      },
  { href: "/dashboard",   icon: LayoutDashboard, label: "Mi espacio"  },
  { href: "/explorar",    icon: Compass,         label: "Explorar"    },
  { href: "/buscar",      icon: Search,          label: "Buscar"      },
  { href: "/propuestas",  icon: GitPullRequest,  label: "Propuestas"  },
];

export function Sidebar() {
  const pathname      = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const username    = session.user?.username;
  const profileHref = username ? `/${username}` : "/bienvenida";
  const needsUsername = !username;

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const itemCls = (href: string) =>
    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium transition-all ${
      isActive(href)
        ? "bg-white/20 text-white"
        : "text-green-100 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-green-700 flex flex-col z-40">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-green-600/60">
        <Link href="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
          <BookOpen className="w-7 h-7" />
          EduHub
        </Link>
      </div>

      {/* ── Username banner ──────────────────────────────────── */}
      {needsUsername && (
        <div className="mx-3 mt-3 bg-amber-400/20 border border-amber-300/30 rounded-xl px-3 py-2.5 space-y-1.5">
          <p className="text-amber-200 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Elegí tu nombre de usuario
          </p>
          <Link href="/bienvenida" className="text-xs font-semibold text-white underline hover:no-underline">
            Configurar ahora →
          </Link>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={itemCls(href)}>
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}

        {/* CTA — compose a post */}
        <Link
          href="/"
          className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-semibold transition-all mt-3 shadow-sm ${
            pathname === "/"
              ? "bg-green-50 text-green-800"
              : "bg-white text-green-700 hover:bg-green-50"
          }`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          Crear publicación
        </Link>

        {/* Secondary — create educational content */}
        <Link
          href="/nuevo"
          className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            isActive("/nuevo")
              ? "bg-white/20 text-white"
              : "text-green-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          <BookOpen className="w-5 h-5 shrink-0" />
          Nuevo kernel / módulo
        </Link>
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 border-t border-green-600/60 pt-3 space-y-1">

        {/* Notificaciones */}
        <NotificationBell
          triggerClass={`flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-base font-medium transition-all ${
            "text-green-100 hover:bg-white/10 hover:text-white"
          }`}
          dropdownClass="absolute left-full bottom-0 ml-3 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden"
          label="Notificaciones"
        />

        {/* Configuración */}
        <Link
          href="/bienvenida"
          className={itemCls("/bienvenida").replace("py-3 text-base", "py-2.5 text-sm")}
        >
          <Settings className="w-5 h-5 shrink-0" />
          Configuración
        </Link>

        {/* Perfil */}
        <Link
          href={profileHref}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            username && pathname === `/${username}`
              ? "bg-white/20 text-white"
              : "text-green-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={28}
              height={28}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(session.user?.name ?? "?")[0]}
            </div>
          )}
          <span className="truncate">{session.user?.name?.split(" ")[0] ?? "Perfil"}</span>
        </Link>

        {/* Cerrar sesión */}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-green-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
