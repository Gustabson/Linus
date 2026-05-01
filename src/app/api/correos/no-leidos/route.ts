import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── GET /api/correos/no-leidos — unread badge count ───────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const count = await prisma.message.count({
    where: {
      recipientId:        session.user.id,  // only own unread
      isRead:             false,
      isDraft:            false,
      deletedByRecipient: false,
    },
  });

  return NextResponse.json({ count });
}
