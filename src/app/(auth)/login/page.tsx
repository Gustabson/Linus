import { signIn } from "@/lib/auth";
import { BookOpen, Globe, GitBranch } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-green-100 p-3 rounded-full">
              <BookOpen className="w-8 h-8 text-green-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a EduHub</h1>
          <p className="text-gray-500 mt-1 text-sm">
            La plataforma educativa colaborativa y abierta
          </p>
        </div>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Globe className="w-5 h-5 text-red-500" />
              Continuar con Google
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <GitBranch className="w-5 h-5" />
              Continuar con GitHub
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          Al ingresar aceptas compartir tu conocimiento educativo con la comunidad.
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-green-700 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
