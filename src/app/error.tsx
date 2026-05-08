"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to an error monitoring service if available
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text">Algo salió mal</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-text-subtle mt-2">
              Código: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-fg rounded-xl hover:bg-primary-h transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border text-text-muted rounded-xl hover:bg-surface transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>

      </div>
    </div>
  );
}
