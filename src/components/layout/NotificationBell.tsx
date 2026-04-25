"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, GitFork, Heart, MessageSquare, UserPlus } from "lucide-react";
import type { NotificationType } from "@prisma/client";

interface NotificationActor {
  name: string | null;
  username: string | null;
  image: string | null;
}

interface Notification {
  id: string;
  type: NotificationType;
  read: boolean;
  link: string;
  createdAt: string;
  actor: NotificationActor;
}

const TYPE_META: Record<NotificationType, { label: string; icon: React.ReactNode }> = {
  NEW_FOLLOWER: {
    label: "te empezó a seguir",
    icon: <UserPlus className="w-3.5 h-3.5 text-green-600" />,
  },
  NEW_FORK: {
    label: "forkeó tu contenido",
    icon: <GitFork className="w-3.5 h-3.5 text-blue-600" />,
  },
  NEW_LIKE: {
    label: "le gustó tu contenido",
    icon: <Heart className="w-3.5 h-3.5 text-red-500" />,
  },
  NEW_COMMENT: {
    label: "comentó en tu documento",
    icon: <MessageSquare className="w-3.5 h-3.5 text-amber-600" />,
  },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "ahora";
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

interface ToastItem {
  id: string;
  notification: Notification;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [open, setOpen]                   = useState(false);
  const [toasts, setToasts]               = useState<ToastItem[]>([]);
  const seenIdsRef  = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── SSE connection ──────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notifications", (e) => {
      const data = JSON.parse(e.data) as {
        notifications: Notification[];
        unreadCount: number;
      };

      // Detect genuinely new notifications for toasts
      const newOnes = data.notifications.filter(
        (n) => !seenIdsRef.current.has(n.id) && !n.read
      );
      newOnes.forEach((n) => seenIdsRef.current.add(n.id));

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      // Show toasts for new arrivals (max 3 at once)
      if (newOnes.length > 0) {
        setToasts((prev) => [
          ...newOnes.slice(0, 3).map((n) => ({ id: n.id, notification: n })),
          ...prev,
        ].slice(0, 5));
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects — nothing to do
    };

    return () => es.close();
  }, []);

  // ── Auto-dismiss toasts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 4_000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Mark all read when opening dropdown ────────────────────────────────────
  const handleOpen = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }, [open, unreadCount]);

  return (
    <>
      {/* ── Bell button + dropdown ── */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleOpen}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
              {notifications.length > 0 && (
                <Link href="#" className="text-xs text-green-700 hover:underline">
                  Ver todas
                </Link>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
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
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !n.read ? "bg-green-50/50" : ""
                      }`}
                    >
                      {/* Actor avatar */}
                      <div className="shrink-0 relative">
                        {n.actor.image ? (
                          <Image
                            src={n.actor.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                            {(n.actor.name ?? "?")[0]}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                          {meta.icon}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 leading-snug">
                          <span className="font-medium">{n.actor.name}</span>{" "}
                          {meta.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>

                      {!n.read && (
                        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Toast stack (bottom-right) ── */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(({ id, notification: n }) => {
          const meta = TYPE_META[n.type];
          return (
            <div
              key={id}
              className="pointer-events-auto bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 max-w-xs"
            >
              {n.actor.image ? (
                <Image
                  src={n.actor.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                  {(n.actor.name ?? "?")[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-900 leading-snug">
                  <span className="font-medium">{n.actor.name}</span>{" "}
                  {meta.label}
                </p>
              </div>
              <span>{meta.icon}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
