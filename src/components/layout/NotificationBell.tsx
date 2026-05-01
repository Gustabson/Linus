"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link   from "next/link";
import Image  from "next/image";
import { Bell, GitFork, Heart, MessageSquare, UserPlus } from "lucide-react";
import type { NotificationType } from "@prisma/client";

interface Notification {
  id: string;
  type: NotificationType;
  read: boolean;
  link: string;
  createdAt: string;
  actor: { name: string | null; username: string | null; image: string | null };
}

const TYPE_META: Record<NotificationType, { label: string; icon: React.ReactNode }> = {
  NEW_FOLLOWER:      { label: "te empezó a seguir",        icon: <UserPlus      className="w-3.5 h-3.5 text-primary" /> },
  NEW_FORK:          { label: "forkeó tu contenido",       icon: <GitFork       className="w-3.5 h-3.5 text-blue-600"  /> },
  NEW_LIKE:          { label: "le gustó tu contenido",     icon: <Heart         className="w-3.5 h-3.5 text-red-500"   /> },
  NEW_COMMENT:       { label: "comentó en tu documento",   icon: <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> },
  NEW_PROPOSAL:      { label: "te envió una propuesta",    icon: <GitFork       className="w-3.5 h-3.5 text-blue-600"  /> },
  PROPOSAL_REVIEWED: { label: "revisó tu propuesta",       icon: <MessageSquare className="w-3.5 h-3.5 text-primary" /> },
};

function formatRelative(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "ahora";
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

const POLL_MS = 60_000;

interface BellProps {
  triggerClass?: string;
  dropdownClass?: string;
  label?: string;
  /** If provided, the bell becomes a link (no dropdown) — used in the sidebar */
  href?: string;
}

export function NotificationBell({
  triggerClass  = "relative flex items-center justify-center w-9 h-9 rounded-xl text-text-muted hover:text-text hover:bg-bg transition-colors",
  dropdownClass = "absolute right-0 top-11 w-80 bg-surface rounded-2xl border border-border shadow-lg z-50 overflow-hidden",
  label,
  href,
}: BellProps = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [open, setOpen]                   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore network errors
    }
  }, []);

  // Initial fetch + polling every 60s + refetch when tab becomes visible
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    function onVisible() { if (document.visibilityState === "visible") fetchNotifications(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  // ── Link mode (sidebar) ──────────────────────────────────────────────────────
  if (href) {
    return (
      <Link href={href} className={triggerClass} aria-label="Notificaciones">
        <Bell className="w-5 h-5 shrink-0" />
        {label && <span className="ml-1">{label}</span>}
        {unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  // ── Dropdown mode (navbar) ────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={triggerClass}
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 shrink-0" />
        {label && <span className="ml-1">{label}</span>}
        {unreadCount > 0 && (
          <span className={`${label ? "ml-auto" : "absolute top-1 right-1"} w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={dropdownClass}>
          <div className="px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-text">Notificaciones</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-subtle">
                No tenés notificaciones
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type];
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-bg transition-colors ${!n.read ? "bg-primary/5/50" : ""}`}
                  >
                    <div className="shrink-0 relative">
                      {n.actor.image ? (
                        <Image src={n.actor.image} alt="" width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {(n.actor.name ?? "?")[0]}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 bg-surface rounded-full p-0.5">
                        {meta.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text leading-snug">
                        <span className="font-medium">{n.actor.name}</span> {meta.label}
                      </p>
                      <p className="text-xs text-text-subtle mt-0.5">{formatRelative(n.createdAt)}</p>
                    </div>

                    {!n.read && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
