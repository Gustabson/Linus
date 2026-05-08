import Link from "next/link";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text">Página no encontrada</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            La página que buscás no existe o fue movida.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-fg rounded-xl hover:bg-primary-h transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
          <Link
            href="/buscar"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border text-text-muted rounded-xl hover:bg-surface transition-colors"
          >
            <Search className="w-4 h-4" />
            Buscar
          </Link>
        </div>

      </div>
    </div>
  );
}
