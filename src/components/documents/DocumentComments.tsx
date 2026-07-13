"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Lock, X, Send, Loader2, Quote } from "lucide-react";
import { CommentCard, type Comment } from "./CommentCard";
import { useRouter } from "@/hooks/useAppRouter";

interface DocumentCommentsProps {
  docId: string;
  isAuthenticated: boolean;
  currentUserId?: string;
  isOwner?: boolean;
  prefilledQuote?: { text: string; sectionType: string } | null;
  onQuoteUsed?: () => void;
  inspector?: boolean;
}

function InspectorComment({ comment, canDelete, onDelete }: {
  comment: Comment;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const initials = (comment.author.name ?? comment.author.username ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="group relative mt-2 grid grid-cols-[28px_minmax(0,1fr)] gap-2 border-l-[3px] border-[var(--workspace-accent,var(--primary))] bg-bg p-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">{initials}</span>
      <div className="min-w-0">
        <strong className="block truncate text-[11px] text-text">{comment.author.name ?? comment.author.username ?? "Usuario"}</strong>
        <p className="mt-1 text-[11px] leading-[1.45] text-text-muted">{comment.content}</p>
      </div>
      {canDelete && (
        <button type="button" onClick={() => onDelete(comment.id)} className="absolute right-1 top-1 opacity-0 text-text-subtle transition-opacity group-hover:opacity-100" aria-label="Eliminar comentario">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DocumentComments({
  docId,
  isAuthenticated,
  currentUserId,
  isOwner = false,
  prefilledQuote,
  onQuoteUsed,
  inspector = false,
}: DocumentCommentsProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const activeQuote = prefilledQuote;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/documents/${docId}/comments`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("No se pudieron cargar los comentarios")))
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("No se pudieron cargar los comentarios.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [docId]);

  // Open form when a quote is prefilled
  useEffect(() => {
    if (prefilledQuote) setShowForm(true);
  }, [prefilledQuote]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError("");

    const privateMessage = activeQuote?.text
      ? `Cita de ${activeQuote.sectionType || "documento"}:\n“${activeQuote.text}”\n\n${content.trim()}`
      : content.trim();
    const res = await fetch(isPrivate ? "/api/proposals" : `/api/documents/${docId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isPrivate
        ? { targetDocumentId: docId, title: subject, description: privateMessage }
        : {
            content,
            quotedText: activeQuote?.text ?? null,
            sectionType: activeQuote?.sectionType ?? null,
          }),
    });

    if (res.ok) {
      const result = await res.json();
      if (isPrivate) {
        setSaving(false);
        router.push(`/propuestas/${result.id}`);
        return;
      }
      const newComment = result;
      setComments((prev) => [...prev, newComment]);
      setContent("");
      setIsPrivate(false);
      setSubject("");
      setShowForm(false);
      onQuoteUsed?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo publicar el comentario.");
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
    else setError("No se pudo eliminar el comentario.");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  const publicComments = comments.filter((c) => !c.isPrivate);
  const privateComments = comments.filter((c) => c.isPrivate);

  return (
    <div className={inspector ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <h3 className={inspector ? "text-[10px] font-bold uppercase text-text-subtle" : "font-semibold text-text flex items-center gap-2"}>
          {!inspector && <MessageSquare className="w-5 h-5 text-text-subtle" />}
          Comentarios
          {!inspector && publicComments.length > 0 && (
            <span className="text-xs bg-border-subtle text-text-muted px-2 py-0.5 rounded-full">
              {publicComments.length}
            </span>
          )}
        </h3>
        {isAuthenticated && (
          <button
            aria-label={inspector ? "Agregar comentario" : undefined}
            onClick={() => { setShowForm(!showForm); onQuoteUsed?.(); }}
            className={inspector
              ? "grid h-7 w-7 place-items-center rounded-md text-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
              : "text-sm text-primary hover:text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
            }
          >
            {inspector ? "+" : "+ Comentar"}
          </button>
        )}
      </div>

      {/* Add comment form */}
      {showForm && isAuthenticated && (
        <form onSubmit={submit} className={inspector ? "space-y-2 border border-primary/20 bg-white p-2.5" : "bg-surface rounded-2xl border border-primary/20 p-4 space-y-3"}>
          {/* Quote preview */}
          {activeQuote && (
            <div className="bg-primary/5 border-l-4 border-primary/40 pl-3 pr-2 py-2 rounded-r-lg flex items-start gap-2">
              <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {activeQuote.sectionType && (
                  <p className="text-xs text-primary font-medium mb-0.5">
                    {activeQuote.sectionType}
                  </p>
                )}
                <p className="text-xs text-primary line-clamp-2">{activeQuote.text}</p>
              </div>
              <button type="button" onClick={onQuoteUsed} className="text-primary hover:text-primary shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isPrivate && (
            <div>
              <label htmlFor={`proposal-subject-${docId}`} className="mb-1 block text-xs font-semibold text-text-muted">Asunto de la propuesta *</label>
              <input
                id={`proposal-subject-${docId}`}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={160}
                placeholder="Ej: Duda sobre los objetivos de aprendizaje"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none"
              />
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isPrivate ? "Explicá tu consulta o propuesta al autor…" : "Dejá tu corrección o comentario…"}
            rows={inspector ? 2 : 3}
            maxLength={5000}
            className={inspector ? "w-full resize-none border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" : "w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {!isOwner ? (
              <div className="flex rounded-lg border border-border bg-bg p-1">
                <button type="button" onClick={() => setIsPrivate(false)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${!isPrivate ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}>Público</button>
                <button type="button" onClick={() => setIsPrivate(true)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${isPrivate ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}>
                  <Lock className="h-3 w-3" /> Propuesta privada
                </button>
              </div>
            ) : <span className="text-xs text-text-subtle">Comentario público</span>}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); onQuoteUsed?.(); }}
                className="text-sm text-text-muted px-3 py-1.5 rounded-lg hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !content.trim() || (isPrivate && !subject.trim())}
                className="flex items-center gap-1.5 text-sm bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-h disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isPrivate ? "Enviar propuesta" : "Publicar"}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

      {/* Historical private notes created before private conversations existed. */}
      {privateComments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-subtle flex items-center gap-1">
            <Lock className="w-3 h-3" /> Notas privadas anteriores
          </p>
          {privateComments.map((c) => inspector
            ? <InspectorComment key={c.id} comment={c} canDelete={c.author.id === currentUserId} onDelete={deleteComment} />
            : <CommentCard key={c.id} comment={c} currentUserId={currentUserId} onDelete={deleteComment} formatDate={formatDate} />
          )}
        </div>
      )}

      {/* Public comments */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-text-subtle animate-spin" />
        </div>
      ) : publicComments.length === 0 ? (
        <div className={inspector ? "py-3 text-center text-[11px] text-text-subtle" : "bg-surface rounded-2xl border border-dashed border-border p-6 text-center text-text-subtle text-sm"}>
          Todavía no hay comentarios.
          {isAuthenticated && " Sé el primero en dejar una corrección."}
        </div>
      ) : (
        <div className="space-y-3">
          {publicComments.map((c) => inspector
            ? <InspectorComment key={c.id} comment={c} canDelete={c.author.id === currentUserId} onDelete={deleteComment} />
            : <CommentCard key={c.id} comment={c} currentUserId={currentUserId} onDelete={deleteComment} formatDate={formatDate} />
          )}
        </div>
      )}
    </div>
  );
}

