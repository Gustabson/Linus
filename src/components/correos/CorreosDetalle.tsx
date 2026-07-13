"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, Reply, Send, Trash2 } from "lucide-react";
import { RichEditor } from "@/components/editor/RichEditor";
import { useRouter } from "@/hooks/useAppRouter";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface UserMini {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface CorreoRespuesta {
  id: string;
  body: string;
  createdAt: string;
  sender: UserMini;
}

interface CorreoDetalleData {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  sender: UserMini;
  recipient: UserMini | null;
  replies: CorreoRespuesta[];
}

function ReplyComposer({
  onSend,
  onCancel,
  sending,
}: {
  onSend: (html: string) => void;
  onCancel: () => void;
  sending: boolean;
}) {
  const [html, setHtml] = useState("");
  const isEmpty = !html || html === "<p></p>";

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Reply className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-bold text-text">Tu respuesta</p>
          <p className="text-[11px] text-text-subtle">Continuá la conversación</p>
        </div>
      </div>
      <RichEditor
        compact
        showEmoji
        minHeight="150px"
        placeholder="Escribí tu respuesta…"
        onChange={setHtml}
      />
      <div className="flex justify-end gap-2 border-t border-border-subtle px-4 py-3">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { if (!isEmpty) onSend(html); }}
          disabled={sending || isEmpty}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-h disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Enviando…" : "Enviar respuesta"}
        </button>
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: UserMini }) {
  if (user.image) {
    return <Image src={user.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {(user.name ?? user.username ?? "?")[0].toUpperCase()}
    </div>
  );
}

function ThreadMessage({
  sender,
  recipient,
  body,
  createdAt,
  isOwn,
  first = false,
}: {
  sender: UserMini;
  recipient?: UserMini | null;
  body: string;
  createdAt: string;
  isOwn: boolean;
  first?: boolean;
}) {
  return (
    <article className={`relative z-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${isOwn ? "ml-5 border-primary/20 bg-primary/5 sm:ml-12" : "mr-5 border-border bg-surface sm:mr-12"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={sender} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text">
              {isOwn ? "Vos" : (sender.name ?? sender.username ?? "Usuario")}
              {!isOwn && sender.username && <span className="ml-1 font-normal text-text-subtle">@{sender.username}</span>}
            </p>
            {first && recipient && (
              <p className="truncate text-xs text-text-subtle">Para: {recipient.name ?? recipient.username ?? "Usuario"}</p>
            )}
          </div>
        </div>
        <time dateTime={createdAt} className="shrink-0 pt-1 text-[11px] text-text-subtle">{formatDate(new Date(createdAt))}</time>
      </div>

      {/* SAFE: message HTML is sanitized server-side before storage. */}
      <div
        className="prose prose-sm mt-4 max-w-none text-text [&_a]:text-primary [&_blockquote]:border-primary/30 [&_li]:text-text [&_p]:text-text [&_strong]:text-text"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </article>
  );
}

export function CorreosDetalle({
  message,
  currentUserId,
  isRecipient,
  backHref,
  backLabel,
}: {
  message: CorreoDetalleData;
  currentUserId: string;
  isRecipient: boolean;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [showReply, setShowReply] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replies, setReplies] = useState<CorreoRespuesta[]>(message.replies);
  const [deleting, startDelete] = useTransition();
  const [sending, startSend] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (isRecipient) window.dispatchEvent(new CustomEvent("correos:read"));
  }, [isRecipient]);

  function handleDelete() {
    startDelete(async () => {
      const scope = isRecipient ? "recipient" : "sender";
      const response = await fetch(`/api/correos/${message.id}?scope=${scope}`, { method: "DELETE" });
      if (response.ok) {
        setShowDeleteConfirm(false);
        router.push(backHref);
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo eliminar el mensaje.");
      }
    });
  }

  function handleReply(htmlBody: string) {
    setError("");
    startSend(async () => {
      const response = await fetch(`/api/correos/${message.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlBody }),
      });
      if (response.ok) {
        const data = await response.json();
        setReplies((current) => [...current, { ...data, createdAt: data.createdAt }]);
        setShowReply(false);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar la respuesta.");
      }
    });
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">
      <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href={backHref} className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-text-muted transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{backLabel}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowReply(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Reply className="h-4 w-4" /> <span className="hidden sm:inline">Responder</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            aria-label="Eliminar mensaje"
            className="grid h-9 w-9 place-items-center rounded-xl text-text-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <header className="py-6 sm:py-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Conversación</p>
        <h1 className="mt-1.5 text-2xl font-bold leading-snug tracking-tight text-text sm:text-3xl">{message.subject || "Sin asunto"}</h1>
        <p className="mt-2 text-sm text-text-subtle">{replies.length + 1} mensaje{replies.length === 0 ? "" : "s"} en este hilo</p>
      </header>

      <div className="relative space-y-3 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border-subtle">
        <ThreadMessage
          sender={message.sender}
          recipient={message.recipient}
          body={message.body}
          createdAt={message.createdAt}
          isOwn={message.sender.id === currentUserId}
          first
        />
        {replies.map((reply) => (
          <ThreadMessage
            key={reply.id}
            sender={reply.sender}
            body={reply.body}
            createdAt={reply.createdAt}
            isOwn={reply.sender.id === currentUserId}
          />
        ))}
      </div>

      <div className="mt-5">
        {showReply ? (
          <ReplyComposer
            onSend={handleReply}
            onCancel={() => { setShowReply(false); setError(""); }}
            sending={sending}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowReply(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <Reply className="h-4 w-4" /> Responder a la conversación
          </button>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          title="¿Mover a la papelera?"
          description={<>El correo <strong className="font-semibold text-text">“{message.subject || "Sin asunto"}”</strong> se quitará solamente de esta carpeta y podrás restaurarlo después.</>}
          confirmLabel="Mover a la papelera"
          busyLabel="Moviendo…"
          busy={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
