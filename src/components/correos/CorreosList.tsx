"use client";

import Link from "next/link";
import Image from "next/image";
import { Inbox } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CorreoRow {
  id:        string;
  subject:   string;
  isRead:    boolean;
  createdAt: string;
  body:      string;
  sender: {
    id:       string;
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
}

interface Props {
  messages:      CorreoRow[];
  folder:        "bandeja" | "enviados" | "borradores";
  currentUserId: string;
}

const FOLDER_LABELS = {
  bandeja:    "Bandeja de entrada",
  enviados:   "Enviados",
  borradores: "Borradores",
};

/** Strip HTML tags to get plain text preview */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function CorreosList({ messages, folder }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-semibold text-gray-600 text-lg">
          {FOLDER_LABELS[folder]} vacía
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {folder === "bandeja"
            ? "Cuando alguien te escriba, aparecerá acá."
            : folder === "enviados"
            ? "Los mensajes que envíes aparecerán acá."
            : "Los borradores guardados aparecerán acá."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-base">
          {FOLDER_LABELS[folder]}
        </h2>
      </div>

      {/* Message rows */}
      <ul className="divide-y divide-gray-100">
        {messages.map((msg) => {
          const isUnread  = !msg.isRead && folder === "bandeja";
          const preview   = stripHtml(msg.body);
          const avatarLetter = (msg.sender.name ?? "?")[0].toUpperCase();

          return (
            <li key={msg.id}>
              <Link
                href={folder === "borradores" ? `/correos/redactar?id=${msg.id}` : `/correos/${msg.id}`}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group ${
                  isUnread ? "bg-green-50/40" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="shrink-0 mt-2">
                  {isUnread
                    ? <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                    : <div className="w-2.5 h-2.5" />
                  }
                </div>

                {/* Avatar */}
                <div className="shrink-0">
                  {msg.sender.image ? (
                    <Image
                      src={msg.sender.image}
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">
                      {avatarLetter}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                      {folder === "bandeja"
                        ? (msg.sender.name ?? "Usuario")
                        : folder === "enviados"
                        ? `Para: ${msg.sender.name ?? "Usuario"}`
                        : (msg.sender.name ? `Para: ${msg.sender.name}` : "Sin destinatario")}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDate(new Date(msg.createdAt))}
                    </span>
                  </div>
                  <p className={`text-sm truncate mt-0.5 ${isUnread ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                    {msg.subject}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {preview || "Sin contenido"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
