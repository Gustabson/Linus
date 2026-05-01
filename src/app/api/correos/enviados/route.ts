import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── GET /api/correos/enviados ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: {
      senderId:          session.user.id,   // only own sent messages
      isDraft:           false,
      deletedBySender:   false,
      recipientId:       { not: null },     // exclude unsent drafts
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, subject: true, createdAt: true, body: true,
      recipient: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json({ messages });
}
