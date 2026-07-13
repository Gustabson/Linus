import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// GET /api/proposals/pending — unread private proposal conversations.
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const count = await prisma.changeProposal.count({
    where: {
      targetTree: { ownerId: session.user.id },
      authorId: { not: session.user.id },
      recipientUnread: true,
    },
  });

  return NextResponse.json({ count });
}
