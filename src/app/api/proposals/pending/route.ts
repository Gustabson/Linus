import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// GET /api/proposals/pending — count of OPEN proposals received by current user
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const count = await prisma.changeProposal.count({
    where: {
      targetTree: { ownerId: session.user.id },
      status:     "OPEN",
    },
  });

  return NextResponse.json({ count });
}
