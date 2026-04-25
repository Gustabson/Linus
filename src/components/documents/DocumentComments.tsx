"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Lock, X, Send, Loader2, Quote } from "lucide-react";
import Image from "next/image";


interface Comment {
  id: string;
  content: string;
  quotedText: string | null;
  sectionType: string | null;
  isPrivate: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface DocumentCommentsProps {
  docId: string;
  isAuthenticated: boolean;
  currentUserId?: string;
  prefilledQuote?: { text: string; sectionType: string } | null;
  onQuoteUsed?: () => void;
}

export function DocumentComments({
  docId,
  isAuthenticated,
  currentUserId,
  prefilledQuote,
  onQuoteUsed,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const activeQuote = prefilledQuote;

  useEffect(() => {
    fetch(`/api/documents/${docId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [docId]);

  // Open form when a quote is prefilled
  useEffect(() => {
    if (prefilledQuote) setShowForm(true);
  }, [prefilledQuote]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);

    const res = await fetch(`/api/documents/${docId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        isPrivate,
        quotedText: activeQuote?.text ?? null,
        sectionType: activeQuote?.sectionType ?? null,
      }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setContent("");
      setIsPrivate(false);
      setShowForm(false);
      onQuoteUsed?.();
    }
    setSaving(false);
  }

  async function deleteComment(id: string) {
    const res = await fetch(`/api/documents/${docId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id }),
    });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  const publicComments = comments.filter((c) => !c.isPrivate);
  const privateComments = comments.filter((c) => c.isPrivate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Comentarios
          {publicComments.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {publicComments.length}
            </span>
          )}
        </h3>
        {isAuthenticated && (
          <button
            onClick={() => { setShowForm(!showForm); onQuoteUsed?.(); }}
            className="text-sm text-green-700 hover:text-green-900 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            + Comentar
          </button>
        )}
      </div>

      {/* Add comment form */}
      {showForm && isAuthenticated && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-green-200 p-4 space-y-3">
          {/* Quote preview */}
          {activeQuote && (
            <div className="bg-green-50 border-l-4 border-green-400 pl-3 pr-2 py-2 rounded-r-lg flex items-start gap-2">
              <Quote className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {activeQuote.sectionType && (
                  <p className="text-xs text-green-700 font-medium mb-0.5">
                    {activeQuote.sectionType}
                  </p>
                )}
                <p className="text-xs text-green-800 line-clamp-2">{activeQuote.text}</p>
              </div>
              <button type="button" onClick={onQuoteUsed} className="text-green-400 hover:text-green-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dejá tu corrección o comentario..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                isPrivate
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Lock className="w-3 h-3" />
              {isPrivate ? "Nota privada" : "Público"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); onQuoteUsed?.(); }}
                className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !content.trim()}
                className="flex items-center gap-1.5 text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Private notes section */}
      {privateComments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Tus notas privadas
          </p>
          {privateComments.map((c) => (
            <CommentCard key={c.id} comment={c} currentUserId={currentUserId} onDelete={deleteComment} formatDate={formatDate} />
          ))}
        </div>
      )}

      {/* Public comments */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : publicComments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
          Todavía no hay comentarios.
          {isAuthenticated && " Sé el primero en dejar una corrección."}
        </div>
      ) : (
        <div className="space-y-3">
          {publicComments.map((c) => (
            <CommentCard key={c.id} comment={c} currentUserId={currentUserId} onDelete={deleteComment} formatDate={formatDate} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  currentUserId,
  onDelete,
  formatDate,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  formatDate: (iso: string) => string;
}) {
  const isOwn = comment.author.id === currentUserId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 group">
      {/* Quote */}
      {comment.quotedText && (
        <div className="bg-gray-50 border-l-4 border-gray-300 pl-3 py-1.5 rounded-r-lg">
          {comment.sectionType && (
            <p className="text-xs text-gray-500 font-medium mb-0.5">
              {comment.sectionType}
            </p>
          )}
          <p className="text-xs text-gray-600 italic line-clamp-2">&ldquo;{comment.quotedText}&rdquo;</p>
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-gray-800">{comment.content}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {comment.author.image ? (
            <Image src={comment.author.image} alt="" width={20} height={20} className="rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {(comment.author.name ?? "?")[0]}
            </div>
          )}
          <span className="text-xs text-gray-500">
            {comment.author.name}
            {comment.author.username && <span className="text-gray-400"> @{comment.author.username}</span>}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
          {comment.isPrivate && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Lock className="w-3 h-3" /> privado
            </span>
          )}
        </div>
        {isOwn && (
          <button
            onClick={() => onDelete(comment.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
