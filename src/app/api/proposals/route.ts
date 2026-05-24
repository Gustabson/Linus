import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";

// GET /api/proposals — list received (owner of target) + sent (author)
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = session.user.id;

  const [received, sent] = await Promise.all([
    prisma.changeProposal.findMany({
      where:   { targetTree: { ownerId: userId } },
      include: {
        sourceTree: { select: { slug: true, title: true, contentType: true } },
        targetTree: { select: { slug: true, title: true } },
        author:     { select: { name: true, username: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.changeProposal.findMany({
      where:   { authorId: userId },
      include: {
        sourceTree: { select: { slug: true, title: true } },
        targetTree: { select: { slug: true, title: true, contentType: true } },
        reviewer:   { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ received, sent });
}

// POST /api/proposals — create a proposal from a fork
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { sourceTreeId, title, description } = body;
  if (!sourceTreeId || !(title as string)?.trim())
    return NextResponse.json({ error: "sourceTreeId y título son requeridos" }, { status: 400 });
  if (String(title).length > 120)
    return NextResponse.json({ error: "Título demasiado largo (máximo 120)" }, { status: 400 });
  if (description != null && String(description).length > 2000)
    return NextResponse.json({ error: "Descripción demasiado larga (máximo 2000)" }, { status: 400 });

  // Source must be owned by current user and be a fork
  const source = await prisma.documentTree.findUnique({
    where:  { id: sourceTreeId as string },
    select: { id: true, slug: true, title: true, ownerId: true, parentTreeId: true },
  });
  if (!source || source.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (!source.parentTreeId)
    return NextResponse.json({ error: "Este árbol no es un fork" }, { status: 400 });

  // No duplicate open proposals
  const existing = await prisma.changeProposal.findFirst({
    where: { sourceTreeId, targetTreeId: source.parentTreeId, status: "OPEN" },
  });
  if (existing)
    return NextResponse.json({ error: "Ya existe una propuesta abierta para este fork" }, { status: 409 });

  const target = await prisma.documentTree.findUnique({
    where:  { id: source.parentTreeId },
    select: { ownerId: true, slug: true },
  });
  if (!target)
    return NextResponse.json({ error: "Árbol original no encontrado" }, { status: 404 });

  const proposal = await prisma.changeProposal.create({
    data: {
      title:        title.trim(),
      description:  description?.trim() || null,
      sourceTreeId: source.id,
      targetTreeId: source.parentTreeId,
      authorId:     session.user.id,
    },
  });

  await createNotification({
    type:        "NEW_PROPOSAL",
    recipientId: target.ownerId,
    actorId:     session.user.id,
    link:        `/propuestas/${proposal.id}`,
  });

  return NextResponse.json({ id: proposal.id });
}
