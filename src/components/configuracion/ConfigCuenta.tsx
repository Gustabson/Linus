"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, KeyRound, Loader2, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";

interface Props {
  email: string | null;
  emailVerified: string | null;
  providers: string[];
  createdAt: string;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-text" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const PROVIDER_META: Record<string, { label: string; icon: React.ReactNode }> = {
  google: { label: "Google", icon: <GoogleIcon /> },
  github: { label: "GitHub", icon: <GitHubIcon /> },
  resend: { label: "Enlace por email", icon: <Mail className="h-4 w-4 shrink-0 text-primary" /> },
};

export function ConfigCuenta({ email, emailVerified, providers, createdAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const joinedDate = new Date(createdAt).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const verifiedViaOAuth = emailVerified && (providers.includes("google") || providers.includes("github"));

  function handleSendMagicLink() {
    if (!email) return;
    setSent(false);
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (response.ok) {
          setSent(true);
          return;
        }
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar el correo.");
      } catch {
        setError("No se pudo enviar el correo. Intentá de nuevo.");
      }
    });
  }

  return (
    <SectionCard title="Cuenta" description="Revisá tu identidad de acceso y las conexiones de tu cuenta.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">Correo electrónico</p>
              <p className="mt-1 truncate text-sm font-bold text-text" title={email ?? undefined}>{email ?? "Sin correo"}</p>
              {emailVerified ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verificado
                  {verifiedViaOAuth && <span className="font-normal text-text-subtle">mediante {providers.includes("google") ? "Google" : "GitHub"}</span>}
                </p>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500"><ShieldAlert className="h-3.5 w-3.5" /> Sin verificar</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">Miembro desde</p>
              <p className="mt-1 text-sm font-bold capitalize text-text">{joinedDate}</p>
              <p className="mt-2 text-xs text-text-subtle">Tu cuenta de LINUG</p>
            </div>
          </div>
        </div>
      </div>

      {!emailVerified && email && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-text">Verificá tu correo</p>
              <p className="mt-0.5 text-xs text-text-muted">Te enviaremos un enlace para confirmar tu identidad.</p>
            </div>
            {sent ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary"><Check className="h-3.5 w-3.5" /> Enlace enviado</span>
            ) : (
              <button type="button" onClick={handleSendMagicLink} disabled={pending} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60">
                {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando</> : <><Mail className="h-3.5 w-3.5" /> Enviar enlace</>}
              </button>
            )}
          </div>
          {error && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-bold text-text">Métodos de acceso</h3>
            <p className="text-[11px] text-text-subtle">Servicios conectados a tu cuenta</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          {providers.length > 0 ? providers.map((provider, index) => {
            const meta = PROVIDER_META[provider] ?? { label: provider, icon: <KeyRound className="h-4 w-4" /> };
            return (
              <div key={provider} className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-border-subtle" : ""}`}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-text">{meta.icon}{meta.label}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><Check className="h-3 w-3" /> Conectado</span>
              </div>
            );
          }) : (
            <p className="px-4 py-3 text-sm text-text-muted">No hay métodos externos conectados.</p>
          )}
        </div>
      </section>
    </SectionCard>
  );
}
