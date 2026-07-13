import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";
import { proposalCounterpartyId } from "@/lib/proposals";

type Params = { params: Promise<{ id: string }> };
const MESSAGE_MAX = 5_000;

export async function POST(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const content = safeString(body.content, MESSAGE_MAX);
  if (!content) {
    return NextResponse.json({ error: `El mensaje debe tener entre 1 y ${MESSAGE_MAX} caracteres` }, { status: 400 });
  }

  const proposal = await prisma.changeProposal.findUnique({
    where: { id },
    select: {
      authorId: true,
      targetTree: { select: { ownerId: true } },
    },
  });
  if (!proposal) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const userId = session.user.id;
  const recipientId = proposalCounterpartyId({
    authorId: proposal.authorId,
    targetOwnerId: proposal.targetTree.ownerId,
    currentUserId: userId,
  });
  if (!recipientId) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.proposalMessage.create({
      data: { proposalId: id, senderId: userId, content },
      include: { sender: { select: { id: true, name: true, username: true, image: true } } },
    });
    await tx.changeProposal.update({
      where: { id },
      data: {
        updatedAt: now,
        ...(proposal.authorId === userId
          ? { authorUnread: false, recipientUnread: true }
          : { recipientUnread: false, authorUnread: true }),
      },
    });
    return created;
  });

  await createNotification({
    type: "PROPOSAL_REVIEWED",
    recipientId,
    actorId: userId,
    link: `/propuestas/${id}`,
  });

  return NextResponse.json(message, { status: 201 });
}
