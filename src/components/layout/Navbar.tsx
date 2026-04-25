"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  BookOpen, Search, LogOut, Menu, X, AlertCircle,
  LayoutDashboard, Home,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Navbar() {
  const { data: session, update, status } = useSession();
  const [open, setOpen] = useState(false);
  const refreshedRef = useRef(false);

  // If the JWT is stale (authenticated but no username in token),
  // force one refresh so the server re-reads the username from DB.
  useEffect(() => {
    if (
      status === "authenticated" &&
      !session?.user?.username &&
      !refreshedRef.current
    ) {
      refreshedRef.current = true;
      update();
    }
  }, [status, session?.user?.username, update]);

  const needsUsername = status === "authenticated" && !session?.user?.username;
  const profileHref = session?.user?.username
    ? `/u/${session.user.username}`
    : "/dashboard";

  return (
    <>
      {/* Username onboarding banner */}
      {needsUsername && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Elegí un nombre de usuario para que otros maestros puedan encontrarte.
            </p>
            <Link
              href="/bienvenida"
              className="shrink-0 text-sm font-medium bg-amber-700 text-white px-3 py-1 rounded-lg hover:bg-amber-800 transition-colors"
            >
              Elegir username
            </Link>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-green-700">
              <BookOpen className="w-6 h-6" />
              <span>EduHub</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {session ? (
                <>
                  <NavLink href="/" icon={<Home className="w-4 h-4" />} label="Inicio" />
                  <NavLink href="/explorar" icon={<Search className="w-4 h-4" />} label="Explorar" />
                  <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Espacio de trabajo" />
                </>
              ) : (
                <NavLink href="/explorar" icon={<Search className="w-4 h-4" />} label="Explorar" />
              )}
            </div>

            {/* Auth section */}
            <div className="hidden md:flex items-center gap-2">
              {session ? (
                <>
                  {/* Avatar → profile */}
                  <Link
                    href={profileHref}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full ring-2 ring-green-100"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                        {(session.user?.name ?? "?")[0]}
                      </div>
                    )}
                    <span className="font-medium">{session.user?.name?.split(" ")[0]}</span>
                  </Link>
                  <NotificationBell />
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-400 hover:text-red-600 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5">
                    Ingresar
                  </Link>
                  <Link
                    href="/registro"
                    className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-1" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="md:hidden py-3 border-t border-gray-100 space-y-1">
              {session ? (
                <>
                  {needsUsername && (
                    <Link href="/bienvenida" className="flex items-center gap-2 px-3 py-2 text-amber-700 font-medium rounded-lg" onClick={() => setOpen(false)}>
                      ⚠ Elegir username
                    </Link>
                  )}
                  <MobileLink href="/"          icon={<Home className="w-4 h-4" />}            label="Inicio"              onClick={() => setOpen(false)} />
                  <MobileLink href="/explorar"  icon={<Search className="w-4 h-4" />}          label="Explorar"            onClick={() => setOpen(false)} />
                  <MobileLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Espacio de trabajo"  onClick={() => setOpen(false)} />
                  <MobileLink href={profileHref} icon={
                    session.user?.image
                      ? <Image src={session.user.image} alt="" width={16} height={16} className="rounded-full" />
                      : <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[9px] font-bold">{(session.user?.name ?? "?")[0]}</div>
                  } label="Mi perfil" onClick={() => setOpen(false)} />
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 w-full text-sm"
                  >
                    <LogOut className="w-4 h-4" /> Salir
                  </button>
                </>
              ) : (
                <>
                  <MobileLink href="/explorar" icon={<Search className="w-4 h-4" />} label="Explorar" onClick={() => setOpen(false)} />
                  <MobileLink href="/login"    icon={null}                            label="Ingresar"  onClick={() => setOpen(false)} />
                  <MobileLink href="/registro" icon={null}                            label="Registrarse" onClick={() => setOpen(false)} />
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileLink({
  href, icon, label, onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
