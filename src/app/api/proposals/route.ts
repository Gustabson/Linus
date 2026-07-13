import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody, safeString } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";

const SUBJECT_MAX = 160;
const MESSAGE_MAX = 5_000;

const conversationInclude = {
  targetTree: {
    select: {
      slug: true,
      title: true,
      contentType: true,
      owner: { select: { id: true, name: true, username: true, image: true } },
    },
  },
  targetDocument: { select: { id: true, slug: true, title: true } },
  author: { select: { id: true, name: true, username: true, image: true } },
  _count: { select: { messages: true } },
} as const;

// GET /api/proposals — private conversations received and sent by the user.
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = session.user.id;
  const [received, sent] = await Promise.all([
    prisma.changeProposal.findMany({
      where: { targetTree: { ownerId: userId }, authorId: { not: userId } },
      include: conversationInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.changeProposal.findMany({
      where: { authorId: userId },
      include: conversationInclude,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ received, sent });
}

// POST /api/proposals — start a private conversation about a document.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const targetDocumentId = safeString(body.targetDocumentId, 100);
  const title = safeString(body.title, SUBJECT_MAX);
  const description = safeString(body.description, MESSAGE_MAX);
  if (!targetDocumentId || !title || !description) {
    return NextResponse.json(
      { error: "Documento, asunto y mensaje son requeridos" },
      { status: 400 },
    );
  }

  const document = await prisma.document.findUnique({
    where: { id: targetDocumentId },
    select: {
      id: true,
      treeId: true,
      versions: { where: { status: "PUBLISHED" }, take: 1, select: { id: true } },
      tree: {
        select: {
          ownerId: true,
          visibility: true,
        },
      },
    },
  });

  if (!document || (document.tree.ownerId !== session.user.id && document.versions.length === 0)) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }
  if (document.tree.visibility === "PRIVATE" && document.tree.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }
  if (document.tree.ownerId === session.user.id) {
    return NextResponse.json({ error: "No podés enviarte una propuesta a vos mismo" }, { status: 400 });
  }

  const now = new Date();
  const proposal = await prisma.changeProposal.create({
    data: {
      title,
      description,
      sourceTreeId: null,
      targetTreeId: document.treeId,
      targetDocumentId: document.id,
      authorId: session.user.id,
      updatedAt: now,
      authorUnread: false,
      recipientUnread: true,
    },
    select: { id: true },
  });

  await createNotification({
    type: "NEW_PROPOSAL",
    recipientId: document.tree.ownerId,
    actorId: session.user.id,
    link: `/propuestas/${proposal.id}`,
  });

  return NextResponse.json({ id: proposal.id }, { status: 201 });
}
