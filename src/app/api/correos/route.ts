import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendCorreoEmail } from "@/lib/notifications";

const SUBJECT_MAX = 200;
const BODY_MAX    = 5000;

const SENDER_SELECT = {
  id: true, name: true, username: true, image: true,
} as const;

// ── GET /api/correos — bandeja de entrada ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: {
      recipientId:        session.user.id,   // only own inbox
      isDraft:            false,
      deletedByRecipient: false,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, subject: true, isRead: true, createdAt: true,
      body: true,   // needed for preview (trimmed client-side)
      sender: { select: SENDER_SELECT },
    },
  });

  return NextResponse.json({ messages });
}

// ── POST /api/correos — enviar nuevo correo ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { subject, htmlBody, recipientUsername, isDraft = false } = body;

  // ── Validate subject
  const trimmedSubject = String(subject ?? "").trim();
  if (!trimmedSubject) {
    return NextResponse.json({ error: "El asunto no puede estar vacío" }, { status: 400 });
  }
  if (trimmedSubject.length > SUBJECT_MAX) {
    return NextResponse.json({ error: `El asunto tiene un máximo de ${SUBJECT_MAX} caracteres` }, { status: 400 });
  }

  // ── Validate & sanitize body
  const trimmedBody = String(htmlBody ?? "").trim();
  if (!trimmedBody || trimmedBody === "<p></p>") {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }
  const cleanBody = sanitizeHtml(trimmedBody);
  if (cleanBody.replace(/<[^>]*>/g, "").length > BODY_MAX) {
    return NextResponse.json({ error: `El mensaje tiene un máximo de ${BODY_MAX} caracteres` }, { status: 400 });
  }

  // ── Resolve recipient (required unless draft)
  let recipientId: string | null = null;
  if (!isDraft) {
    if (!recipientUsername) {
      return NextResponse.json({ error: "Seleccioná un destinatario" }, { status: 400 });
    }
    const recipient = await prisma.user.findUnique({
      where:  { username: String(recipientUsername) },
      select: { id: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    recipientId = recipient.id;
  }

  const message = await prisma.message.create({
    data: {
      subject:     trimmedSubject,
      body:        cleanBody,
      isDraft,
      senderId:    session.user.id,
      recipientId,
    },
    select: {
      id: true, subject: true, isDraft: true, createdAt: true,
      recipient: { select: SENDER_SELECT },
    },
  });

  // Send email notification if recipient has it enabled (fire-and-forget)
  if (!isDraft && recipientId) {
    const sender = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { name: true, username: true },
    });
    const senderName  = sender?.name ?? sender?.username ?? "Alguien";
    const previewText = cleanBody.replace(/<[^>]*>/g, "").slice(0, 120);
    sendCorreoEmail({ recipientId, senderName, subject: trimmedSubject, previewText });
  }

  return NextResponse.json(message, { status: 201 });
}
