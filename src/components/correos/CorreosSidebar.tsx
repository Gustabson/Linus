"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, FileText, Pencil } from "lucide-react";

interface Props {
  unreadCount: number;
}

const FOLDERS = [
  { href: "/correos",            icon: Inbox,    label: "Bandeja",    short: "Bandeja" },
  { href: "/correos/enviados",   icon: Send,     label: "Enviados",   short: "Enviados" },
  { href: "/correos/borradores", icon: FileText, label: "Borradores", short: "Borrad." },
];

export function CorreosSidebar({ unreadCount }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/correos") return pathname === "/correos";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop: vertical sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col bg-surface">
        {/* Redactar */}
        <div className="p-4">
          <Link
            href="/correos/redactar"
            className={`w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-2xl shadow-sm transition-colors ${
              pathname === "/correos/redactar"
                ? "bg-primary-h text-white"
                : "bg-primary hover:bg-primary-h text-white"
            }`}
          >
            <Pencil className="w-4 h-4" />
            Redactar
          </Link>
        </div>

        {/* Carpetas */}
        <nav className="flex-1 px-2 space-y-0.5">
          {FOLDERS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-primary/5 text-primary"
                  : "text-text-muted hover:bg-border-subtle hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {href === "/correos" && unreadCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Mobile: horizontal compact bar ───────────────────────────────── */}
      <div className="flex md:hidden items-center gap-1 px-2 py-2 bg-surface border-b border-border overflow-x-auto shrink-0">
        {/* Redactar button */}
        <Link
          href="/correos/redactar"
          className={`shrink-0 flex items-center gap-1.5 font-semibold text-xs px-3 py-1.5 rounded-xl transition-colors ${
            pathname === "/correos/redactar"
              ? "bg-primary-h text-white"
              : "bg-primary hover:bg-primary-h text-white"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          Redactar
        </Link>

        {/* Separator */}
        <div className="w-px h-5 bg-border shrink-0" />

        {/* Folder links */}
        {FOLDERS.map(({ href, icon: Icon, short }) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-colors relative ${
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-border-subtle hover:text-text"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {short}
            {href === "/correos" && unreadCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
