"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, Inbox, Loader2, Search, Send, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type MailFolder = "bandeja" | "enviados" | "borradores";

interface CorreoRow {
  id: string;
  subject: string;
  isRead: boolean;
  createdAt: string;
  body: string;
  sender: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

const FOLDER_META: Record<MailFolder, { label: string; description: string; empty: string }> = {
  bandeja: {
    label: "Bandeja de entrada",
    description: "Mensajes que recibiste de la comunidad",
    empty: "Cuando alguien te escriba, aparecerá acá.",
  },
  enviados: {
    label: "Enviados",
    description: "Mensajes que compartiste con otros usuarios",
    empty: "Los mensajes que envíes aparecerán acá.",
  },
  borradores: {
    label: "Borradores",
    description: "Mensajes guardados para continuar después",
    empty: "Los borradores guardados aparecerán acá.",
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function formatMailDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startToday - startDate) / 86_400_000);

  if (days === 0) {
    return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  if (days === 1) return "Ayer";
  return formatDate(date);
}

export function CorreosList({
  messages: initialMessages,
  folder,
  initialCursor,
}: {
  messages: CorreoRow[];
  folder: MailFolder;
  initialCursor: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState(initialCursor);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const meta = FOLDER_META[folder];

  const unreadCount = folder === "bandeja"
    ? messages.filter((message) => !message.isRead).length
    : 0;

  const visibleMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return messages.filter((message) => {
      if (folder === "bandeja" && unreadOnly && message.isRead) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        message.sender.name,
        message.sender.username,
        message.subject,
        stripHtml(message.body),
      ].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return searchable.includes(normalizedQuery);
    });
  }, [folder, messages, query, unreadOnly]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ folder, cursor });
      const response = await fetch(`/api/correos?${params}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar más mensajes");
      const incoming = (data.messages ?? []) as CorreoRow[];
      setMessages((current) => {
        const ids = new Set(current.map((message) => message.id));
        return [...current, ...incoming.filter((message) => !ids.has(message.id))];
      });
      setCursor(data.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar más mensajes");
    } finally {
      setLoading(false);
    }
  }

  const FolderIcon = folder === "bandeja" ? Inbox : folder === "enviados" ? Send : FileText;
  const hasFilters = !!query.trim() || unreadOnly;

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FolderIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-text">{meta.label}</h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-fg">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="mt-0.5 hidden text-xs text-text-subtle sm:block">{meta.description}</p>
            </div>
          </div>
          <span className="pt-1 text-xs font-medium text-text-subtle">{messages.length} cargado{messages.length === 1 ? "" : "s"}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-bg px-3 focus-within:border-primary/40">
            <Search className="h-4 w-4 shrink-0 text-text-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por persona, asunto o contenido"
              aria-label="Buscar correos"
              className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="text-text-subtle hover:text-text">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          {folder === "bandeja" && (
            <div className="flex rounded-xl border border-border bg-bg p-1" aria-label="Filtrar mensajes">
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                aria-pressed={!unreadOnly}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${!unreadOnly ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                aria-pressed={unreadOnly}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${unreadOnly ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text"}`}
              >
                No leídos
              </button>
            </div>
          )}
        </div>
      </header>

      {visibleMessages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            {hasFilters ? <Search className="h-6 w-6" /> : <FolderIcon className="h-6 w-6" />}
          </span>
          <h2 className="mt-4 font-bold text-text">
            {hasFilters ? "No encontramos mensajes" : `${meta.label} vacía`}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-text-muted">
            {hasFilters ? "Probá con otra búsqueda o cambiá el filtro." : meta.empty}
          </p>
          {hasFilters && (
            <button type="button" onClick={() => { setQuery(""); setUnreadOnly(false); }} className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15">
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle" aria-label={meta.label}>
          {visibleMessages.map((message) => (
            <MessageRow key={message.id} message={message} folder={folder} />
          ))}
        </ul>
      )}

      {(cursor || error) && (
        <div className="border-t border-border-subtle px-4 py-4 text-center sm:px-6">
          {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
          {cursor && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Cargando…" : "Cargar más mensajes"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageRow({ message, folder }: { message: CorreoRow; folder: MailFolder }) {
  const unread = folder === "bandeja" && !message.isRead;
  const preview = stripHtml(message.body) || "Sin contenido";
  const avatarLetter = (message.sender.name ?? message.sender.username ?? "?")[0].toUpperCase();
  const href = folder === "borradores" ? `/correos/redactar?id=${message.id}` : `/correos/${message.id}`;
  const personLabel = folder === "bandeja"
    ? (message.sender.name ?? message.sender.username ?? "Usuario")
    : folder === "borradores"
      ? (message.sender.name && message.sender.name !== "Sin destinatario" ? `Para: ${message.sender.name}` : "Sin destinatario")
      : `Para: ${message.sender.name ?? message.sender.username ?? "Usuario"}`;

  return (
    <li className="relative">
      {unread && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
      <Link
        href={href}
        className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5 transition-colors sm:px-6 ${unread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-bg"}`}
      >
        <div className="relative shrink-0">
          {message.sender.image ? (
            <Image src={message.sender.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{avatarLetter}</div>
          )}
          {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-primary" />}
        </div>

        <div className="min-w-0 lg:grid lg:grid-cols-[minmax(8rem,0.35fr)_minmax(0,1fr)] lg:gap-5">
          <div className="min-w-0">
            <p className={`truncate text-sm ${unread ? "font-bold text-text" : "font-semibold text-text"}`}>{personLabel}</p>
            {message.sender.username && <p className="mt-0.5 hidden truncate text-[11px] text-text-subtle lg:block">@{message.sender.username}</p>}
          </div>
          <div className="min-w-0">
            <p className={`mt-0.5 truncate text-sm lg:mt-0 ${unread ? "font-bold text-text" : "font-medium text-text"}`}>{message.subject || "Sin asunto"}</p>
            <p className="mt-0.5 truncate text-xs text-text-subtle">{preview}</p>
          </div>
        </div>

        <time dateTime={message.createdAt} className={`shrink-0 pt-0.5 text-[11px] ${unread ? "font-bold text-primary" : "text-text-subtle"}`}>
          {formatMailDate(message.createdAt)}
        </time>
      </Link>
    </li>
  );
}
