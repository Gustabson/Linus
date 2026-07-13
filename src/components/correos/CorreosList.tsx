"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, Inbox, Loader2, RotateCcw, Search, Send, Trash2, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type MailFolder = "bandeja" | "enviados" | "borradores" | "papelera";

interface CorreoRow {
  id: string;
  subject: string;
  isRead: boolean;
  createdAt: string;
  body: string;
  origin?: "bandeja" | "enviados" | "borradores";
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
  papelera: {
    label: "Papelera",
    description: "Mensajes eliminados solamente de tu cuenta",
    empty: "Los mensajes que elimines aparecerán acá.",
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
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);
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

  async function runMessageAction(id: string, action: "trash" | "restore" | "purge") {
    if (busyMessageId) return;
    if (action === "purge" && !window.confirm("¿Eliminar este mensaje definitivamente de tu cuenta?")) return;
    setBusyMessageId(id);
    setError("");
    try {
      const response = action === "restore"
        ? await fetch(`/api/correos/${id}/restore`, { method: "POST" })
        : await fetch(`/api/correos/${id}${action === "purge" ? "?permanent=true" : ""}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el mensaje");
      const removedMessage = messages.find((message) => message.id === id);
      setMessages((current) => current.filter((message) => message.id !== id));
      if (action === "trash" && folder === "bandeja" && removedMessage && !removedMessage.isRead) {
        window.dispatchEvent(new CustomEvent("correos:read"));
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar el mensaje");
    } finally {
      setBusyMessageId(null);
    }
  }

  async function emptyTrash() {
    if (emptyingTrash || messages.length === 0) return;
    if (!window.confirm("¿Vaciar la papelera? Los mensajes dejarán de estar disponibles en tu cuenta.")) return;
    setEmptyingTrash(true);
    setError("");
    try {
      const response = await fetch("/api/correos/papelera", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo vaciar la papelera");
      setMessages([]);
      setCursor(null);
    } catch (emptyError) {
      setError(emptyError instanceof Error ? emptyError.message : "No se pudo vaciar la papelera");
    } finally {
      setEmptyingTrash(false);
    }
  }

  const FolderIcon = folder === "bandeja" ? Inbox : folder === "enviados" ? Send : folder === "borradores" ? FileText : Trash2;
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-subtle">{messages.length} cargado{messages.length === 1 ? "" : "s"}</span>
            {folder === "papelera" && messages.length > 0 && (
              <button
                type="button"
                onClick={() => void emptyTrash()}
                disabled={emptyingTrash}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                {emptyingTrash ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Vaciar papelera
              </button>
            )}
          </div>
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
            <MessageRow
              key={message.id}
              message={message}
              folder={folder}
              busy={busyMessageId === message.id}
              onTrash={() => void runMessageAction(message.id, "trash")}
              onRestore={() => void runMessageAction(message.id, "restore")}
              onPurge={() => void runMessageAction(message.id, "purge")}
            />
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

function MessageRow({
  message,
  folder,
  busy,
  onTrash,
  onRestore,
  onPurge,
}: {
  message: CorreoRow;
  folder: MailFolder;
  busy: boolean;
  onTrash: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const unread = folder === "bandeja" && !message.isRead;
  const preview = stripHtml(message.body) || "Sin contenido";
  const avatarLetter = (message.sender.name ?? message.sender.username ?? "?")[0].toUpperCase();
  const href = folder === "borradores" ? `/correos/redactar?id=${message.id}` : `/correos/${message.id}`;
  const displayFolder = folder === "papelera" ? message.origin : folder;
  const personLabel = displayFolder === "bandeja"
    ? (message.sender.name ?? message.sender.username ?? "Usuario")
    : displayFolder === "borradores"
      ? (message.sender.name && message.sender.name !== "Sin destinatario" ? `Para: ${message.sender.name}` : "Sin destinatario")
      : `Para: ${message.sender.name ?? message.sender.username ?? "Usuario"}`;

  const rowContent = (
    <>
      <div className="relative shrink-0">
        {message.sender.image ? (
          <Image src={message.sender.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{avatarLetter}</div>
        )}
        {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-primary" />}
      </div>

      <div className="min-w-0 lg:grid lg:grid-cols-[max-content_minmax(0,1fr)] lg:gap-3">
        <div className="min-w-0 lg:max-w-40">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className={`truncate text-sm ${unread ? "font-bold text-text" : "font-semibold text-text"}`}>{personLabel}</p>
            {folder === "papelera" && message.origin && (
              <span className="shrink-0 rounded-full bg-border-subtle px-1.5 py-0.5 text-[9px] font-semibold text-text-subtle">
                {message.origin === "bandeja" ? "Recibido" : message.origin === "enviados" ? "Enviado" : "Borrador"}
              </span>
            )}
          </div>
          {message.sender.username && <p className="mt-0.5 hidden truncate text-[11px] text-text-subtle lg:block">@{message.sender.username}</p>}
        </div>
        <div className="min-w-0">
          <p className={`mt-0.5 truncate text-sm lg:mt-0 ${unread ? "font-bold text-text" : "font-medium text-text"}`}>{message.subject || "Sin asunto"}</p>
          <p className="mt-0.5 truncate text-xs text-text-subtle">{preview}</p>
        </div>
      </div>

      <time dateTime={message.createdAt} className={`shrink-0 pt-0.5 text-[11px] ${folder === "papelera" ? "hidden sm:block" : ""} ${unread ? "font-bold text-primary" : "text-text-subtle"}`}>
        {formatMailDate(message.createdAt)}
      </time>
    </>
  );

  return (
    <li className={`group relative flex items-stretch ${unread ? "bg-primary/5" : ""}`}>
      {unread && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
      {folder === "papelera" ? (
        <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5 sm:px-6">{rowContent}</div>
      ) : (
        <Link href={href} className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5 transition-colors hover:bg-bg sm:px-6">
          {rowContent}
        </Link>
      )}

      <div className="flex shrink-0 items-center gap-0.5 pr-2">
        {folder === "papelera" ? (
          <>
            <button
              type="button"
              onClick={onRestore}
              disabled={busy}
              title="Restaurar"
              aria-label={`Restaurar ${message.subject}`}
              className="grid h-9 w-9 place-items-center rounded-xl text-text-subtle transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onPurge}
              disabled={busy}
              title="Eliminar definitivamente"
              aria-label={`Eliminar definitivamente ${message.subject}`}
              className="grid h-9 w-9 place-items-center rounded-xl text-text-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onTrash}
            disabled={busy}
            title="Mover a la papelera"
            aria-label={`Mover ${message.subject} a la papelera`}
            className="grid h-9 w-9 place-items-center rounded-xl text-text-subtle opacity-70 transition-colors hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </li>
  );
}
