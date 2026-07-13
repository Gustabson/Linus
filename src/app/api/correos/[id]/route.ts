import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { sanitizeHtml } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { resolveMailScope, type MailDeletionScope } from "@/lib/mail-trash";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/correos/[id] — fetch + auto-mark read ────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  const message = await prisma.message.findFirst({
    where: { id, parentId: null },
    include: {
      sender:    { select: USER_BASIC_SELECT },
      recipient: { select: USER_BASIC_SELECT },
      replies: {
        where:   { deletedByRecipient: false, deletedBySender: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: USER_BASIC_SELECT } },
      },
    },
  });

  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isRecipient = message.recipientId === session.user.id;
  const isSender    = message.senderId    === session.user.id;

  if (!isRecipient && !isSender)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  if (isSender    && message.deletedBySender)    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (isRecipient && message.deletedByRecipient) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Auto-mark as read when recipient opens the message
  if (isRecipient && !message.isRead) {
    await prisma.message.update({ where: { id }, data: { isRead: true } });
  }

  return NextResponse.json({ ...message, isRead: isRecipient ? true : message.isRead });
}

// ── PATCH /api/correos/[id] — update or send an existing draft ────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  // Only the original sender can edit their own draft
  const existing = await prisma.message.findUnique({
    where:  { id },
    select: { senderId: true, isDraft: true },
  });

  if (!existing)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (existing.senderId !== session.user.id)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  if (!existing.isDraft)
    return NextResponse.json({ error: "Solo se pueden editar borradores" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { subject, htmlBody, recipientUsername, isDraft = true } = body;

  // Validate subject
  const trimmedSubject = String(subject ?? "").trim();
  if (!trimmedSubject)
    return NextResponse.json({ error: "El asunto no puede estar vacío" }, { status: 400 });
  if (trimmedSubject.length > 200)
    return NextResponse.json({ error: "El asunto tiene un máximo de 200 caracteres" }, { status: 400 });

  // Validate & sanitize body
  const trimmedBody = String(htmlBody ?? "").trim();
  if (!trimmedBody || trimmedBody === "<p></p>")
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  const cleanBody = sanitizeHtml(trimmedBody);

  // Resolve recipient — required when actually sending (isDraft = false)
  let recipientId: string | null = null;
  if (!isDraft) {
    if (!recipientUsername)
      return NextResponse.json({ error: "Seleccioná un destinatario" }, { status: 400 });

    const recipient = await prisma.user.findUnique({
      where:  { username: String(recipientUsername) },
      select: { id: true },
    });
    if (!recipient)
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    recipientId = recipient.id;
  }

  const updated = await prisma.message.update({
    where: { id },
    data: {
      subject:     trimmedSubject,
      body:        cleanBody,
      isDraft:     isDraft as boolean,
      ...(recipientId !== null ? { recipientId } : {}),
    },
    select: { id: true, subject: true, isDraft: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/correos/[id] — soft delete (per side) ────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const searchParams = new URL(req.url).searchParams;
  const permanent = searchParams.get("permanent") === "true";
  const requestedScope = searchParams.get("scope");
  if (requestedScope && !["sender", "recipient", "both"].includes(requestedScope)) {
    return NextResponse.json({ error: "Alcance de eliminación inválido" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where:  { id },
    select: {
      senderId: true,
      recipientId: true,
      deletedBySender: true,
      deletedByRecipient: true,
    },
  });

  if (!message) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isRecipient = message.recipientId === session.user.id;
  const isSender    = message.senderId    === session.user.id;

  if (!isRecipient && !isSender)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const resolvedScope = resolveMailScope(requestedScope as MailDeletionScope | null, isSender, isRecipient);
  if (!resolvedScope) {
    return NextResponse.json({ error: "Ese correo no pertenece a esa carpeta" }, { status: 403 });
  }
  const { affectSender, affectRecipient } = resolvedScope;

  if (permanent) {
    const canPurgeAsSender = affectSender && message.deletedBySender;
    const canPurgeAsRecipient = affectRecipient && message.deletedByRecipient;
    if (!canPurgeAsSender && !canPurgeAsRecipient) {
      return NextResponse.json({ error: "El mensaje debe estar en la papelera" }, { status: 400 });
    }
    await prisma.message.update({
      where: { id },
      data: {
        ...(canPurgeAsSender ? { purgedBySender: true } : {}),
        ...(canPurgeAsRecipient ? { purgedByRecipient: true } : {}),
      },
    });
  } else {
    await prisma.message.update({
      where: { id },
      data: {
        ...(affectSender ? { deletedBySender: true, purgedBySender: false } : {}),
        ...(affectRecipient ? { deletedByRecipient: true, purgedByRecipient: false } : {}),
      },
    });
  }

  revalidatePath("/correos", "layout");
  revalidatePath("/linus-2/correos", "layout");
  return NextResponse.json({ ok: true, permanent, scope: requestedScope });
}
