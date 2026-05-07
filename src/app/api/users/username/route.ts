import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody } from "@/lib/api-helpers";

const USERNAME_REGEX = /^[a-z0-9_-]{3,32}$/;

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { username } = body;

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: "El username debe tener entre 3 y 32 caracteres. Solo letras minúsculas, números, guiones y guiones bajos." },
      { status: 400 }
    );
  }

  // Check availability
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "Ese username ya está en uso" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { username },
  });

  return NextResponse.json({ ok: true, username });
}
