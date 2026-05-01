import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { sanitizeHtml } from "@/lib/sanitize";

type Params = { params: Promise<{ id: string }> };

const BODY_MAX = 5000;

// ── POST /api/correos/[id]/reply ──────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: parentId } = await params;

  // Fetch parent — verify access
  const parent = await prisma.message.findUnique({
    where:  { parentId: null, id: parentId },   // only top-level messages can be replied to
    select: { id: true, senderId: true, recipientId: true, isDraft: true },
  });

  if (!parent || parent.isDraft) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  // Only the recipient of the original message can reply
  if (parent.recipientId !== session.user.id) {
    return NextResponse.json({ error: "Solo el destinatario puede responder" }, { status: 403 });
  }

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
      subject:     "Re:",      // replies don't need separate subject
      body:        cleanBody,
      senderId:    session.user.id,
      recipientId: parent.senderId,  // reply goes back to original sender
      parentId,
      isDraft:     false,
    },
    include: {
      sender: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json(reply, { status: 201 });
}
