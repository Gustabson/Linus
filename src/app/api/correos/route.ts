import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendCorreoEmail } from "@/lib/notifications";
import { getTrashPresentation } from "@/lib/mail-trash";

const SUBJECT_MAX = 200;
const BODY_MAX    = 5000;
const PAGE_SIZE   = 30;

// ── GET /api/correos — bandeja de entrada ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const folder = searchParams.get("folder") ?? "bandeja";

  if (!["bandeja", "enviados", "borradores", "papelera"].includes(folder)) {
    return NextResponse.json({ error: "Carpeta inválida" }, { status: 400 });
  }

  const cursorDate = cursor ? new Date(cursor) : null;
  if (cursorDate && isNaN(cursorDate.getTime()))
    return NextResponse.json({ error: "Parámetro cursor inválido" }, { status: 400 });

  const cursorFilter = cursorDate ? { createdAt: { lt: cursorDate } } : {};
  let messages;

  if (folder === "papelera") {
    const rows = await prisma.message.findMany({
      where: {
        parentId: null,
        OR: [
          { senderId: session.user.id, deletedBySender: true, purgedBySender: false },
          { recipientId: session.user.id, deletedByRecipient: true, purgedByRecipient: false },
        ],
        ...cursorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        subject: true,
        isRead: true,
        isDraft: true,
        createdAt: true,
        body: true,
        senderId: true,
        recipientId: true,
        deletedBySender: true,
        deletedByRecipient: true,
        purgedBySender: true,
        purgedByRecipient: true,
        sender: { select: USER_BASIC_SELECT },
        recipient: { select: USER_BASIC_SELECT },
      },
    });
    messages = rows.flatMap(({
      sender,
      recipient,
      senderId,
      recipientId,
      isDraft,
      deletedBySender,
      deletedByRecipient,
      purgedBySender,
      purgedByRecipient,
      ...message
    }) => {
      const presentation = getTrashPresentation({
        senderId,
        recipientId,
        isDraft,
        deletedBySender,
        deletedByRecipient,
        purgedBySender,
        purgedByRecipient,
      }, session.user.id);
      if (!presentation) return [];
      const showRecipient = presentation.origin !== "bandeja";
      return {
        ...message,
        isRead: true,
        origin: presentation.origin,
        trashScope: presentation.scope,
        sender: showRecipient
          ? (recipient ?? { id: "", name: "Sin destinatario", username: null, image: null })
          : sender,
      };
    });
  } else if (folder === "bandeja") {
    messages = await prisma.message.findMany({
      where: {
        parentId: null,
        recipientId: session.user.id,
        isDraft: false,
        deletedByRecipient: false,
        ...cursorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        subject: true,
        isRead: true,
        createdAt: true,
        body: true,
        sender: { select: USER_BASIC_SELECT },
      },
    });
  } else {
    const rows = await prisma.message.findMany({
      where: {
        parentId: null,
        senderId: session.user.id,
        isDraft: folder === "borradores",
        deletedBySender: false,
        ...(folder === "enviados" ? { recipientId: { not: null } } : {}),
        ...cursorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        subject: true,
        isRead: true,
        createdAt: true,
        body: true,
        recipient: { select: USER_BASIC_SELECT },
      },
    });
    messages = rows.map(({ recipient, ...message }) => ({
      ...message,
      isRead: folder === "borradores" ? true : message.isRead,
      sender: recipient ?? {
        id: "",
        name: folder === "borradores" ? "Sin destinatario" : "Desconocido",
        username: null,
        image: null,
      },
    }));
  }

  const hasMore = messages.length > PAGE_SIZE;
  if (hasMore) messages.pop();
  const nextCursor = hasMore && messages.length > 0
    ? messages[messages.length - 1].createdAt.toISOString()
    : null;

  return NextResponse.json({ messages, nextCursor });
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
      recipient: { select: USER_BASIC_SELECT },
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
