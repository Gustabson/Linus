"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Mail, Send, FileText, Pencil, Trash2 } from "lucide-react";

interface Props {
  unreadCount: number;
}

const FOLDERS = [
  { href: "/correos",            icon: Inbox,    label: "Bandeja",    short: "Bandeja" },
  { href: "/correos/enviados",   icon: Send,     label: "Enviados",   short: "Enviados" },
  { href: "/correos/borradores", icon: FileText, label: "Borradores", short: "Borrad." },
  { href: "/correos/papelera",   icon: Trash2,  label: "Papelera",   short: "Papelera" },
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
      <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 px-4 pb-1 pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-bold text-text">Correos</p>
            <p className="text-[11px] text-text-subtle">Mensajes privados</p>
          </div>
        </div>

        {/* Redactar */}
        <div className="p-3.5">
          <Link
            href="/correos/redactar"
            className={`w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-2xl shadow-sm transition-colors ${
              pathname === "/correos/redactar"
                ? "bg-primary-h text-primary-fg"
                : "bg-primary text-primary-fg hover:bg-primary-h"
            }`}
          >
            <Pencil className="w-4 h-4" />
            Redactar
          </Link>
        </div>

        {/* Carpetas */}
        <nav className="flex-1 space-y-1 px-2">
          {FOLDERS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-border-subtle hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {href === "/correos" && unreadCount > 0 && (
                <span className="min-w-[20px] rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-bold text-primary-fg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

      </aside>

      {/* Mobile: no bar — navigation handled by BottomNav modal */}
    </>
  );
}
