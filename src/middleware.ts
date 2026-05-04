import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ── Rutas que requieren autenticación ──────────────────────────────────────
const PROTECTED = ["/dashboard", "/configuracion", "/correos", "/propuestas",
  "/nuevo", "/notificaciones", "/bienvenida", "/reset"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Redirigir a login si no está autenticado y la ruta es protegida
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (needsAuth && !req.auth?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// ── Matcher: todas las rutas menos assets y API ───────────────────────────
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
