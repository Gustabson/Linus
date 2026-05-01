"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LayoutDashboard, Plus } from "lucide-react";

const ITEMS = [
  { href: "/",          icon: Home,            label: "Inicio"     },
  { href: "/buscar",    icon: Search,          label: "Buscar"     },
  { href: "/nuevo",     icon: Plus,            label: "Crear"      },
  { href: "/dashboard", icon: LayoutDashboard, label: "Mi espacio" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex lg:hidden safe-area-bottom">
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              active ? "text-green-700" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className={`w-5 h-5 ${href === "/nuevo" ? "stroke-[2.5]" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
