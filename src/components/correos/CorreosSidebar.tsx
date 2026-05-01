"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, FileText, Pencil } from "lucide-react";

interface Props {
  unreadCount: number;
}

const FOLDERS = [
  { href: "/correos",            icon: Inbox,    label: "Bandeja de entrada" },
  { href: "/correos/enviados",   icon: Send,     label: "Enviados"           },
  { href: "/correos/borradores", icon: FileText, label: "Borradores"         },
];

export function CorreosSidebar({ unreadCount }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/correos") return pathname === "/correos";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 flex flex-col bg-white">
      {/* Redactar — full page navigation */}
      <div className="p-4">
        <Link
          href="/correos/redactar"
          className={`w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-2xl shadow-sm transition-colors ${
            pathname === "/correos/redactar"
              ? "bg-green-800 text-white"
              : "bg-green-700 hover:bg-green-800 text-white"
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
                ? "bg-green-50 text-green-800"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {href === "/correos" && unreadCount > 0 && (
              <span className="bg-green-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
