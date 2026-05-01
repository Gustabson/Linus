"use client";

import { ShieldCheck, Mail } from "lucide-react";

interface Props {
  email:         string | null;
  emailVerified: Date | string | null;
  providers:     string[];
  createdAt:     Date | string;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google:      <GoogleIcon />,
  github:      <GitHubIcon />,
  credentials: <Mail className="w-4 h-4" />,
};

const PROVIDER_LABELS: Record<string, string> = {
  google:      "Google",
  github:      "GitHub",
  credentials: "Correo y contraseña",
};

export function ConfigCuenta({ email, emailVerified, providers, createdAt }: Props) {
  const verified    = !!emailVerified;
  const joinedDate  = new Date(createdAt).toLocaleDateString("es-AR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Cuenta</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Información de tu cuenta y métodos de inicio de sesión.
        </p>
      </div>

      {/* Email row */}
      <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</p>
          <p className="text-sm text-gray-900 dark:text-white">{email ?? "—"}</p>
        </div>
        {verified ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" /> Verificado
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full shrink-0">
            Sin verificar
          </span>
        )}
      </div>

      {/* Providers */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Métodos de acceso</p>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <span
              key={p}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full"
            >
              {PROVIDER_ICONS[p] ?? <Mail className="w-4 h-4" />}
              {PROVIDER_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      </div>

      {/* Member since */}
      <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400">
          Miembro desde el {joinedDate}
        </p>
      </div>
    </section>
  );
}
