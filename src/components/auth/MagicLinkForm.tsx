"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, Check, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

export function MagicLinkForm() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || pending) return;
    setError("");

    startTransition(async () => {
      const result = await signIn("nodemailer", {
        email:      email.trim().toLowerCase(),
        redirect:   false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("No se pudo enviar el link. Verificá el correo e intentá de nuevo.");
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-2">
        <div className="w-10 h-10 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-green-800">¡Link enviado!</p>
        <p className="text-xs text-green-700">
          Revisá <span className="font-medium">{email}</span> — hacé click en el link para entrar.
          Expira en 10 minutos.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-xs text-green-600 underline hover:no-underline"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="magic-email" className="block text-xs font-medium text-text-subtle mb-1.5">
          Entrá con tu correo electrónico
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
            <input
              id="magic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              className="w-full pl-9 pr-3 py-3 text-sm border border-border rounded-xl focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-text-subtle text-text"
            />
          </div>
          <button
            type="submit"
            disabled={!email.trim() || pending}
            className="flex items-center gap-1.5 bg-primary text-primary-fg text-sm font-semibold px-4 py-3 rounded-xl hover:bg-primary-h disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {pending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ArrowRight className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 px-1">{error}</p>
      )}
      <p className="text-xs text-text-subtle px-1">
        Te enviamos un link mágico — sin contraseña, solo hacé click y entrás.
      </p>
    </form>
  );
}
