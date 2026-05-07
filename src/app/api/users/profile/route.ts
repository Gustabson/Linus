import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { name, username, bio, website, location } = body;

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
