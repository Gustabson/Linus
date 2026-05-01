"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, GitFork, Heart, MessageSquare, UserPlus,
  CheckCheck, Loader2,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";

interface Notification {
  id:        string;
  type:      NotificationType;
  read:      boolean;
  link:      string;
  createdAt: string;
  actor: {
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
}

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META: Record<NotificationType, { label: string; icon: React.ReactNode; section: "social" | "contenido" }> = {
  NEW_FOLLOWER:      { label: "te empezó a seguir",      icon: <UserPlus      className="w-4 h-4 text-primary"     />, section: "social"    },
  NEW_FORK:          { label: "forkeó tu contenido",     icon: <GitFork       className="w-4 h-4 text-blue-500"   />, section: "social"    },
  NEW_LIKE:          { label: "le gustó tu contenido",   icon: <Heart         className="w-4 h-4 text-red-500"    />, section: "social"    },
  NEW_COMMENT:       { label: "comentó en tu documento", icon: <MessageSquare className="w-4 h-4 text-amber-500"  />, section: "contenido" },
  NEW_PROPOSAL:      { label: "te envió una propuesta",  icon: <GitFork       className="w-4 h-4 text-blue-500"   />, section: "contenido" },
  PROPOSAL_REVIEWED: { label: "revisó tu propuesta",     icon: <MessageSquare className="w-4 h-4 text-primary"    />, section: "contenido" },
};

function formatRelative(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "ahora mismo";
  if (mins  < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours}h`;
  if (days  < 7)  return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Single notification row ───────────────────────────────────────────────────
function NotificationRow({ n }: { n: Notification }) {
  const meta = TYPE_META[n.type];
  return (
    <Link
      href={n.link}
      className={`flex items-start gap-4 px-5 py-4 hover:bg-bg transition-colors rounded-xl group ${
        !n.read ? "bg-primary/5" : ""
      }`}
    >
      {/* Avatar + type icon */}
      <div className="relative shrink-0">
        {n.actor.image ? (
          <Image src={n.actor.image} alt="" width={40} height={40} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(n.actor.name ?? "?")[0].toUpperCase()}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-border-subtle">
          {meta.icon}
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text leading-snug">
          <span className="font-semibold">{n.actor.name ?? "Alguien"}</span>{" "}
          {meta.label}
        </p>
        {n.actor.username && (
          <p className="text-xs text-text-subtle mt-0.5">@{n.actor.username}</p>
        )}
        <p className="text-xs text-text-subtle mt-1">{formatRelative(n.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <span className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, items }: { title: string; items: Notification[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <h2 className="text-xs font-semibold text-text-subtle uppercase tracking-wider px-5 py-3 border-b border-border-subtle bg-bg">
        {title}
      </h2>
      <div className="divide-y divide-border-subtle">
        {items.map((n) => (
          <NotificationRow key={n.id} n={n} />
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [marking, setMarking]             = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markAllRead() {
    if (marking || unreadCount === 0) return;
    setMarking(true);
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarking(false);
  }

  // Split by section
  const social    = notifications.filter((n) => TYPE_META[n.type].section === "social");
  const contenido = notifications.filter((n) => TYPE_META[n.type].section === "contenido");

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">Notificaciones</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-text-subtle">{unreadCount} sin leer</p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 border border-border"
          >
            {marking
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCheck className="w-4 h-4" />
            }
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-text-subtle" />
        </div>
      )}

      {/* Empty */}
      {!loading && notifications.length === 0 && (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-14 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-border-subtle flex items-center justify-center">
            <Bell className="w-6 h-6 text-text-subtle" />
          </div>
          <p className="text-text-muted font-medium text-sm">No tenés notificaciones todavía.</p>
          <p className="text-text-subtle text-xs">Cuando alguien interactúe con tu contenido, aparecerá aquí.</p>
        </div>
      )}

      {/* Sections */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-4">
          <Section title="Social"   items={social}    />
          <Section title="Contenido" items={contenido} />
        </div>
      )}
    </div>
  );
}
