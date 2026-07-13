"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import {
  Compass,
  GitPullRequest,
  Home,
  LayoutGrid,
  Mail,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { LinugMark } from "@/components/brand/LinugMark";
import styles from "./Linus2Workspace.module.css";

const NAV_ITEMS = [
  { label: "Inicio", icon: Home, href: "/linus-2/feed" },
  { label: "Mi espacio", icon: LayoutGrid, href: "/linus-2" },
  { label: "Explorar", icon: Compass, href: "/linus-2/explorar" },
  { label: "Buscar", icon: Search, href: "/linus-2/buscar" },
  { label: "Propuestas", icon: GitPullRequest, href: "/linus-2/propuestas" },
  { label: "Correos", icon: Mail, href: "/linus-2/correos" },
];

interface Linus2ShellProps {
  children: React.ReactNode;
  userName: string | null;
  username: string | null;
}

export function Linus2Shell({ children, userName, username }: Linus2ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditorPreview = pathname === "/linus-2/editor-preview";

  function isActive(href: string) {
    return href === "/linus-2"
      ? pathname === href || pathname.startsWith("/linus-2/kernel/")
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function keepNavigationInLinus2(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/linus-2") || url.pathname.startsWith("/api/")) return;

    event.preventDefault();
    router.push(`/linus-2${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className={styles.shell} onClickCapture={keepNavigationInLinus2}>
      <aside className={styles.globalNav}>
        <Link href="/linus-2" className={styles.brand}>
          <span className={styles.brandMark}><LinugMark width={18} height={18} /></span>
          <span>Linus 2</span>
        </Link>

        <nav className={styles.navList} aria-label="Navegación principal">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
            <Link key={href} href={href} className={`${styles.navItem} ${isActive(href) ? styles.navActive : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.navFooter}>
          <Link href="/linus-2/configuracion" className={`${styles.navItem} ${isActive("/linus-2/configuracion") ? styles.navActive : ""}`}>
            <Settings size={18} />Configuración
          </Link>
          <Link href={username ? `/linus-2/${username}` : "/linus-2/configuracion"} className={`${styles.navItem} ${username && isActive(`/linus-2/${username}`) ? styles.navActive : ""}`}>
            <UserRound size={18} />{userName?.split(" ")[0] ?? "Perfil"}
          </Link>
        </div>
      </aside>

      <main className={`${styles.main} ${isEditorPreview ? "" : styles.appMain}`}>{children}</main>

      <nav className={styles.mobileNav} aria-label="Navegación móvil">
        <Link href="/linus-2/feed" className={isActive("/linus-2/feed") ? styles.mobileActive : ""}><Home size={19} /><span>Inicio</span></Link>
        <Link href="/linus-2" className={isActive("/linus-2") ? styles.mobileActive : ""}><LayoutGrid size={19} /><span>Espacio</span></Link>
        <Link href="/linus-2/nuevo" className={styles.createButton} title="Crear"><Plus size={22} /></Link>
        <Link href="/linus-2/buscar" className={isActive("/linus-2/buscar") ? styles.mobileActive : ""}><Search size={19} /><span>Buscar</span></Link>
        <Link href="/linus-2/correos" className={isActive("/linus-2/correos") ? styles.mobileActive : ""}><Mail size={19} /><span>Correos</span></Link>
      </nav>
    </div>
  );
}
