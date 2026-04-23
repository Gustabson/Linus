"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { BookOpen, GitFork, Search, LogOut, User, Menu, X, AlertCircle } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const needsUsername = session && !session.user?.username;

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
            <div className="hidden md:flex items-center gap-6">
              <Link href="/explorar" className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1">
                <Search className="w-4 h-4" />
                Explorar
              </Link>
              <Link href="/kernels" className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1">
                <GitFork className="w-4 h-4" />
                Kernels
              </Link>
            </div>

            {/* Auth */}
            <div className="hidden md:flex items-center gap-3">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    <User className="w-4 h-4" />
                    {session.user?.name?.split(" ")[0]}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
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
            <button className="md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="md:hidden py-3 border-t border-gray-100 space-y-2">
              <Link href="/explorar" className="block px-2 py-1 text-gray-700" onClick={() => setOpen(false)}>Explorar</Link>
              <Link href="/kernels" className="block px-2 py-1 text-gray-700" onClick={() => setOpen(false)}>Kernels</Link>
              {session ? (
                <>
                  {needsUsername && (
                    <Link href="/bienvenida" className="block px-2 py-1 text-amber-700 font-medium" onClick={() => setOpen(false)}>
                      ⚠ Elegir username
                    </Link>
                  )}
                  <Link href="/dashboard" className="block px-2 py-1 text-gray-700" onClick={() => setOpen(false)}>Mi espacio</Link>
                  <button onClick={() => signOut()} className="block px-2 py-1 text-red-600 w-full text-left">Salir</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-2 py-1 text-gray-700" onClick={() => setOpen(false)}>Ingresar</Link>
                  <Link href="/registro" className="block px-2 py-1 text-green-700 font-medium" onClick={() => setOpen(false)}>Registrarse</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
