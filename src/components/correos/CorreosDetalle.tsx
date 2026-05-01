"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Reply, Send, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserMini {
  id:       string;
  name:     string | null;
  username: string | null;
  image:    string | null;
}

interface ReplyData {
  id:        string;
  body:      string;
  createdAt: string;
  sender:    UserMini;
}

interface MessageDetail {
  id:          string;
  subject:     string;
  body:        string;
  createdAt:   string;
  sender:      UserMini;
  recipient:   UserMini | null;
  replies:     ReplyData[];
}

interface Props {
  message:       MessageDetail;
  currentUserId: string;
  isRecipient:   boolean;
}

export function CorreosDetalle({ message, currentUserId, isRecipient }: Props) {
  const router = useRouter();
  const [showReply, setShowReply]   = useState(false);
  const [replyText, setReplyText]   = useState("");
  const [replies, setReplies]       = useState<ReplyData[]>(message.replies);
  const [deleting, startDelete]     = useTransition();
  const [sending,  startSend]       = useTransition();
  const [error, setError]           = useState("");

  function handleDelete() {
    startDelete(async () => {
      const res = await fetch(`/api/correos/${message.id}`, { method: "DELETE" });
      if (res.ok) router.push("/correos");
      else setError("No se pudo eliminar el mensaje.");
    });
  }

  function handleReply() {
    if (!replyText.trim()) return;
    setError("");
    startSend(async () => {
      const res  = await fetch(`/api/correos/${message.id}/reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ htmlBody: `<p>${replyText.trim()}</p>` }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplies((prev) => [...prev, { ...data, createdAt: data.createdAt }]);
        setReplyText("");
        setShowReply(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar la respuesta.");
      }
    });
  }

  const avatarFor = (user: UserMini) =>
    user.image ? (
      <Image src={user.image} alt="" width={40} height={40} className="rounded-full shrink-0" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
        {(user.name ?? "?")[0].toUpperCase()}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Back */}
      <Link
        href="/correos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Bandeja de entrada
      </Link>

      {/* Subject */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-snug">
        {message.subject}
      </h1>

      {/* Main message card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Sender row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatarFor(message.sender)}
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {message.sender.name ?? "Usuario"}
                {message.sender.username && (
                  <span className="font-normal text-gray-400 ml-1">
                    @{message.sender.username}
                  </span>
                )}
              </p>
              {message.recipient && (
                <p className="text-xs text-gray-400">
                  Para: {message.recipient.name ?? "Usuario"}
                  {message.recipient.username && ` (@${message.recipient.username})`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">
              {formatDate(new Date(message.createdAt))}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Eliminar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Body — sanitized HTML from server */}
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: message.body }}
        />
      </div>

      {/* Thread replies */}
      {replies.length > 0 && (
        <div className="mt-4 space-y-3 pl-6 border-l-2 border-gray-100">
          {replies.map((reply) => (
            <div key={reply.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                {avatarFor(reply.sender)}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{reply.sender.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(new Date(reply.createdAt))}</p>
                </div>
              </div>
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: reply.body }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reply area — only recipient can reply */}
      {isRecipient && (
        <div className="mt-6">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-2 text-sm font-medium text-green-700 border border-green-200 px-4 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              <Reply className="w-4 h-4" />
              Responder
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Tu respuesta</p>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribí tu respuesta..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowReply(false); setReplyText(""); setError(""); }}
                  className="text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="flex items-center gap-2 text-sm font-semibold bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {sending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                    : <><Send className="w-3.5 h-3.5" /> Enviar</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !showReply && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
