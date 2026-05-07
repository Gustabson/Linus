import Link from "next/link";
import { LogIn } from "lucide-react";

interface Props {
  feature?: string;
}

export function LoginRequired({ feature = "esta sección" }: Props) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl border border-border p-10 max-w-sm w-full text-center space-y-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text mb-2">Necesitás una cuenta</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Para acceder a {feature} tenés que iniciar sesión o crear una cuenta. Es gratis.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Link
            href="/login"
            className="bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-h transition-colors block"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/login"
            className="border border-border text-text py-3 rounded-xl font-medium hover:bg-bg transition-colors block"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
