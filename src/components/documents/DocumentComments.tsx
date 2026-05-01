"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Lock, X, Send, Loader2, Quote } from "lucide-react";
import { CommentCard, type Comment } from "./CommentCard";

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
        <h3 className="font-semibold text-text flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-text-subtle" />
          Comentarios
          {publicComments.length > 0 && (
            <span className="text-xs bg-border-subtle text-text-muted px-2 py-0.5 rounded-full">
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
        <form onSubmit={submit} className="bg-surface rounded-2xl border border-green-200 p-4 space-y-3">
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
            className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                isPrivate
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-border text-text-muted hover:border-gray-300"
              }`}
            >
              <Lock className="w-3 h-3" />
              {isPrivate ? "Nota privada" : "Público"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); onQuoteUsed?.(); }}
                className="text-sm text-text-muted px-3 py-1.5 rounded-lg hover:bg-bg"
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
          <p className="text-xs text-text-subtle flex items-center gap-1">
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
          <Loader2 className="w-5 h-5 text-text-subtle animate-spin" />
        </div>
      ) : publicComments.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-6 text-center text-text-subtle text-sm">
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

