"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Send } from "lucide-react";

type Entry = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; image: string | null };
};

export function ProposalConversation({
  proposalId,
  currentUserId,
  initialEntries,
}: {
  proposalId: string;
  currentUserId: string;
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    }).then((response) => {
      if (response.ok) window.dispatchEvent(new Event("proposals:read"));
    });
  }, [proposalId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    setError("");
    const response = await fetch(`/api/proposals/${proposalId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar el mensaje");
      setSending(false);
      return;
    }
    setEntries((current) => [...current, data]);
    setContent("");
    setSending(false);
    textareaRef.current?.focus();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="space-y-4 p-4 sm:p-6">
        {entries.length === 0 && <p className="py-8 text-center text-sm text-text-muted">Esta conversación todavía no tiene mensajes.</p>}
        {entries.map((entry) => {
          const own = entry.sender.id === currentUserId;
          return (
            <article key={entry.id} className={`flex gap-2.5 ${own ? "flex-row-reverse" : ""}`}>
              {entry.sender.image ? (
                <Image src={entry.sender.image} alt="" width={34} height={34} className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {(entry.sender.name ?? entry.sender.username ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div className={`max-w-[82%] ${own ? "text-right" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 text-left ${own ? "rounded-tr-md bg-primary text-primary-fg" : "rounded-tl-md bg-bg text-text"}`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.content}</p>
                </div>
                <p className="mt-1 px-1 text-[10px] text-text-subtle">
                  {entry.sender.name ?? `@${entry.sender.username ?? "usuario"}`} · {new Date(entry.createdAt).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-border-subtle p-4 sm:p-5">
        <label htmlFor="proposal-reply" className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-subtle">Responder</label>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-primary/40">
          <textarea
            id="proposal-reply"
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit(event);
            }}
            maxLength={5000}
            rows={2}
            placeholder="Escribí un mensaje privado…"
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-text placeholder:text-text-subtle focus:outline-none"
          />
          <button type="submit" disabled={sending || !content.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg hover:bg-primary-h disabled:opacity-40" aria-label="Enviar mensaje">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[11px] text-text-subtle">
          <span>{error || "Ctrl + Enter para enviar"}</span>
          <span>{content.length}/5000</span>
        </div>
      </form>
    </section>
  );
}
