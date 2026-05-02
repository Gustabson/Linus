import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

// POST /api/auth/send-verification
// Triggers the Resend magic link for an already-registered user
// Used from ConfigCuenta to re-send verification to unverified accounts
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string")
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  if (!process.env.RESEND_API_KEY)
    return NextResponse.json({ error: "Magic link no configurado" }, { status: 503 });

  try {
    await signIn("resend", { email: email.trim().toLowerCase(), redirect: false });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-verification]", err);
    return NextResponse.json({ error: "No se pudo enviar el link" }, { status: 500 });
  }
}
