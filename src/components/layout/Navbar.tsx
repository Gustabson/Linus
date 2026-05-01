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

  useEffect(() => {
    if (status === "authenticated" && !session?.user?.username && !refreshedRef.current) {
      refreshedRef.current = true;
      update();
    }
  }, [status, session?.user?.username, update]);

  const needsUsername = status === "authenticated" && !session?.user?.username;
  const profileHref   = session?.user?.username ? `/${session.user.username}` : "/dashboard";

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
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-green-700 shrink-0">
              <BookOpen className="w-6 h-6" />
              <span>EduHub</span>
            </Link>

            {/* Desktop nav — 3 links only */}
            {session && (
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/"          icon={<Home            className="w-4 h-4" />} label="Inicio"     />
                <NavLink href="/buscar"  icon={<Search          className="w-4 h-4" />} label="Buscar"   />
                <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Mi espacio" />
              </div>
            )}

            {/* Auth section */}
            <div className="hidden md:flex items-center gap-2">
              {session ? (
                <>
                  <Link
                    href={profileHref}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={30}
                        height={30}
                        className="rounded-full ring-2 ring-green-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">
                        {(session.user?.name ?? "?")[0]}
                      </div>
                    )}
                    <span className="font-medium">{session.user?.name?.split(" ")[0]}</span>
                  </Link>
                  <NotificationBell />
                  <button
                    onClick={() => signOut()}
                    title="Cerrar sesión"
                    className="text-gray-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="bg-green-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-green-800 transition-colors font-medium">
                    Ingresar con Google
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-50" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="md:hidden py-3 border-t border-gray-100 space-y-1">
              {session ? (
                <>
                  {needsUsername && (
                    <Link href="/bienvenida" className="flex items-center gap-2 px-3 py-2.5 text-amber-700 font-medium rounded-xl bg-amber-50" onClick={() => setOpen(false)}>
                      ⚠ Elegir nombre de usuario
                    </Link>
                  )}
                  <MobileLink href="/"          icon={<Home            className="w-4 h-4" />} label="Inicio"     onClick={() => setOpen(false)} />
                  <MobileLink href="/buscar"  icon={<Search          className="w-4 h-4" />} label="Buscar"   onClick={() => setOpen(false)} />
                  <MobileLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Mi espacio" onClick={() => setOpen(false)} />
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <MobileLink
                      href={profileHref}
                      icon={
                        session.user?.image
                          ? <Image src={session.user.image} alt="" width={18} height={18} className="rounded-full" />
                          : <div className="w-[18px] h-[18px] rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[9px] font-bold">{(session.user?.name ?? "?")[0]}</div>
                      }
                      label="Mi perfil"
                      onClick={() => setOpen(false)}
                    />
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 px-3 py-2.5 text-red-500 rounded-xl hover:bg-red-50 w-full text-sm transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <MobileLink href="/buscar" icon={<Search className="w-4 h-4" />} label="Buscar"           onClick={() => setOpen(false)} />
                  <MobileLink href="/login"    icon={null}                            label="Ingresar con Google" onClick={() => setOpen(false)} />
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
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
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
      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
