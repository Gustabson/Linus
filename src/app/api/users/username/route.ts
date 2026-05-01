import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_REGEX = /^[a-z0-9_-]{3,32}$/;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { username } = await req.json();

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
