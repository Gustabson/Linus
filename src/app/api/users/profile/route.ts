import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, username, bio, website, location } = await req.json();

  // Check username uniqueness
  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
    });
    if (existing)
      return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name?.trim() || undefined,
      username: username?.trim().toLowerCase() || null,
      bio: bio?.trim() || null,
      website: website?.trim() || null,
      location: location?.trim() || null,
    },
  });

  return NextResponse.json({ username: user.username, name: user.name });
}
