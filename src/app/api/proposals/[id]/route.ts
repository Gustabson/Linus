import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody, rejectCrossOrigin } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

async function getParticipant(id: string, userId: string) {
  const proposal = await prisma.changeProposal.findUnique({
    where: { id },
    select: { authorId: true, targetTree: { select: { ownerId: true } } },
  });
  if (!proposal) return null;
  if (proposal.authorId !== userId && proposal.targetTree.ownerId !== userId) return null;
  return proposal;
}

// PATCH /api/proposals/[id] — mark a private conversation as read.
export async function PATCH(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await parseBody(req);
  if (!body || body.action !== "read") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const proposal = await getParticipant(id, session.user.id);
  if (!proposal) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.changeProposal.update({
    where: { id },
    data: proposal.authorId === session.user.id
      ? { authorUnread: false }
      : { recipientUnread: false },
  });

  return NextResponse.json({ ok: true });
}
