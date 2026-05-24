import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";

export async function GET(req: NextRequest) {
  // Requiere auth: evita enumeración pública de usuarios
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      username: { not: null },
      OR: [
        { name:     { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      ...USER_BASIC_SELECT, bio: true,
      _count: { select: { followers: true, ownedTrees: true } },
      // Include whether the current user follows each result
      followers: session?.user?.id
        ? { where: { followerId: session.user.id }, select: { id: true } }
        : false,
    },
    take: 20,
    orderBy: { followers: { _count: "desc" } },
  });

  return NextResponse.json(users);
}
