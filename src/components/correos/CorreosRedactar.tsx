"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Save, Loader2, Trash2, Check } from "lucide-react";
import { RichEditor } from "@/components/editor/RichEditor";
import { UserSearchInput } from "./UserSearchInput";

interface Props {
  draftId?:          string;
  initialSubject?:   string;
  initialBody?:      string;
  initialRecipient?: { username: string; name: string } | null;
}

export function CorreosRedactar({
  draftId,
  initialSubject   = "",
  initialBody      = "",
  initialRecipient = null,
}: Props) {
  const router         = useRouter();
  const isEditingDraft = !!draftId;

  const [subject,   setSubject]   = useState(initialSubject);
  const [recipient, setRecipient] = useState<{ username: string; name: string } | null>(initialRecipient);
  const [sending,   startSend]    = useTransition();
  const [saving,    startSave]    = useTransition();
  const [error,     setError]     = useState("");
  const [sent,      setSent]      = useState(false);

  // Latest HTML body — updated on every editor change via onChange prop
  const bodyRef = useRef(initialBody);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const savedDraftId  = useRef<string | null>(draftId ?? null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectRef    = useRef(subject);
  const sentRef       = useRef(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { sentRef.current    = sent;    }, [sent]);

  const doAutoSave = useCallback(async (subj: string, html: string) => {
    const hasContent = subj.trim() || (html && html !== "<p></p>");
    if (!hasContent || sentRef.current) return;

    setAutoSaveState("saving");
    try {
      let res: Response;
      if (savedDraftId.current) {
        res = await fetch(`/api/correos/${savedDraftId.current}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subj || "Borrador sin título", htmlBody: html, isDraft: true }),
        });
      } else {
        res = await fetch("/api/correos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subj || "Borrador sin título", htmlBody: html, isDraft: true }),
        });
        if (res.ok) {
          const data = await res.json();
          savedDraftId.current = data.id;
        }
      }
      setAutoSaveState(res.ok ? "saved" : "idle");
    } catch {
      setAutoSaveState("idle");
    }
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (sentRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveState("idle");
    const subj = subjectRef.current;
    const html = bodyRef.current;
    autoSaveTimer.current = setTimeout(() => doAutoSave(subj, html), 5 * 60 * 1000);
  }, [doAutoSave]);

  // Also trigger on subject change
  useEffect(() => {
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setError("");
    const htmlBody = bodyRef.current;
    const idToUse  = savedDraftId.current;

    startSend(async () => {
      let res: Response;
      if (idToUse) {
        res = await fetch(`/api/correos/${idToUse}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, htmlBody, recipientUsername: recipient?.username ?? null, isDraft: false }),
        });
      } else {
        res = await fetch("/api/correos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, htmlBody, recipientUsername: recipient?.username ?? null, isDraft: false }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Error al enviar el correo."); return; }
      setSent(true);
      setTimeout(() => router.push("/correos/enviados"), 1200);
    });
  }, [subject, recipient, router]);

  // ── Save draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setError("");
    const htmlBody = bodyRef.current;
    const idToUse  = savedDraftId.current;

    startSave(async () => {
      let res: Response;
      if (idToUse) {
        res = await fetch(`/api/correos/${idToUse}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject || "Borrador sin título", htmlBody, recipientUsername: recipient?.username ?? null, isDraft: true }),
        });
      } else {
        res = await fetch("/api/correos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject || "Borrador sin título", htmlBody, recipientUsername: recipient?.username ?? null, isDraft: true }),
        });
      }
      if (res.ok) router.push("/correos/borradores");
      else { const data = await res.json().catch(() => ({})); setError(data.error ?? "Error al guardar el borrador."); }
    });
  }, [subject, recipient, router]);

  function handleDiscard() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    router.push(isEditingDraft ? "/correos/borradores" : "/correos");
  }

  // ── Auto-save label ───────────────────────────────────────────────────────
  function AutoSaveLabel() {
    if (autoSaveState === "saving") return (
      <span className="flex items-center gap-1 text-xs text-text-subtle">
        <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
      </span>
    );
    if (autoSaveState === "saved") return (
      <span className="flex items-center gap-1 text-xs text-text-subtle">
        <Check className="w-3 h-3 text-green-500" /> Guardado
      </span>
    );
    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Header — desktop ────────────────────────────────────────── */}
      <div className="hidden sm:flex px-6 py-4 border-b border-border-subtle items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-text text-base">
            {isEditingDraft ? "Editar borrador" : "Nuevo correo"}
          </h2>
          <AutoSaveLabel />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDiscard} disabled={sending || saving}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
            {isEditingDraft ? "Cancelar" : "Descartar"}
          </button>
          <button onClick={handleSaveDraft} disabled={saving || sending}
            className="flex items-center gap-1.5 text-sm text-text-muted border border-border px-4 py-2 rounded-xl hover:bg-bg disabled:opacity-50 transition-colors">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> Guardar borrador</>}
          </button>
          <button onClick={handleSend} disabled={sending || saving}
            className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-fg px-5 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors shadow-sm">
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar</>}
          </button>
        </div>
      </div>

      {/* ── Header — mobile ─────────────────────────────────────────── */}
      <div className="flex sm:hidden items-center gap-1 px-2 py-2.5 border-b border-border-subtle">
        <AutoSaveLabel />
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={handleDiscard} disabled={sending || saving}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-red-500 px-2.5 py-2 rounded-xl hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Descartar
          </button>
          <button onClick={handleSaveDraft} disabled={saving || sending}
            className="flex items-center gap-1 text-sm text-text-muted border border-border px-2.5 py-2 rounded-xl hover:bg-bg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          <button onClick={handleSend} disabled={sending || saving}
            className="flex items-center gap-1 text-sm font-semibold bg-primary text-primary-fg px-3 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
      </div>

      {/* ── Para / Asunto ────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle divide-y divide-border-subtle">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <span className="text-sm text-text-subtle w-12 sm:w-16 shrink-0">Para</span>
          <UserSearchInput value={recipient} onChange={setRecipient} />
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <span className="text-sm text-text-subtle w-12 sm:w-16 shrink-0">Asunto</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo" maxLength={200}
            className="flex-1 text-sm text-text placeholder:text-text-subtle focus:outline-none" />
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────── */}
      <RichEditor
        compact
        showEmoji
        scrollable
        contentClassName="px-4 sm:px-6 py-4"
        minHeight="280px"
        initialContent={initialBody}
        placeholder="Escribí tu mensaje acá..."
        onChange={(html) => { bodyRef.current = html; triggerAutoSave(); }}
      />

      {/* ── Feedback ────────────────────────────────────────────────── */}
      {(error || sent) && (
        <div className={`px-6 py-3 border-t text-sm font-medium ${
          sent ? "bg-primary/5 border-primary/10 text-primary"
               : "bg-red-50 border-red-100 text-red-600"
        }`}>
          {sent ? "✓ Correo enviado. Redirigiendo..." : error}
        </div>
      )}
    </div>
  );
}
