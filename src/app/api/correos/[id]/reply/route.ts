import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { sanitizeHtml } from "@/lib/sanitize";

type Params = { params: Promise<{ id: string }> };

const BODY_MAX = 5000;

// ── POST /api/correos/[id]/reply ──────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: parentId } = await params;

  // Fetch parent — must be a top-level non-draft message
  const parent = await prisma.message.findFirst({
    where:  { id: parentId, parentId: null, isDraft: false },
    select: { id: true, senderId: true, recipientId: true },
  });

  if (!parent) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  // Either participant in the thread can reply
  const isParticipant =
    parent.senderId === session.user.id || parent.recipientId === session.user.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  // Reply goes to the other party
  const replyRecipientId =
    parent.senderId === session.user.id ? parent.recipientId : parent.senderId;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { htmlBody } = body;
  const trimmed = String(htmlBody ?? "").trim();
  if (!trimmed || trimmed === "<p></p>") {
    return NextResponse.json({ error: "La respuesta no puede estar vacía" }, { status: 400 });
  }
  const cleanBody = sanitizeHtml(trimmed);
  if (cleanBody.replace(/<[^>]*>/g, "").length > BODY_MAX) {
    return NextResponse.json({ error: `Máximo ${BODY_MAX} caracteres` }, { status: 400 });
  }

  const reply = await prisma.message.create({
    data: {
      subject:     "Re:",
      body:        cleanBody,
      senderId:    session.user.id,
      recipientId: replyRecipientId,
      parentId,
      isDraft:     false,
    },
    include: {
      sender: { select: USER_BASIC_SELECT },
    },
  });

  return NextResponse.json(reply, { status: 201 });
}
