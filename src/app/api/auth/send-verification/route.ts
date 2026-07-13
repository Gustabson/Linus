import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { getSession, parseBody, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { enforceRateLimit } from "@/lib/rate-limit";

// POST /api/auth/send-verification
// Triggers the Resend magic link for an already-registered user
// Used from ConfigCuenta to re-send verification to unverified accounts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await parseBody(req, 2_000);
  const email = body?.email;

  if (!email || typeof email !== "string")
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_RE.test(normalized))
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (session.user.email?.trim().toLowerCase() !== normalized)
    return NextResponse.json({ error: "Sólo podés verificar el correo de tu cuenta" }, { status: 403 });

  const limited = await enforceRateLimit({
    action: "email-verification",
    userId: session.user.id,
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  if (!process.env.RESEND_API_KEY)
    return NextResponse.json({ error: "Magic link no configurado" }, { status: 503 });

  try {
    await signIn("resend", { email: normalized, redirect: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el link" }, { status: 500 });
  }
}
