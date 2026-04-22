import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ available: false });

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
