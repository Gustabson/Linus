import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── GET /api/configuracion — current user's full settings ────────────────────
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:            true,
      name:          true,
      username:      true,
      email:         true,
      emailVerified: true,
      image:         true,
      bio:           true,
      website:       true,
      location:      true,
      createdAt:     true,
      notifCorreos:     true,
      notifComentarios: true,
      notifLikes:       true,
      notifSeguidores:  true,
      notifPropuestas:  true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json(user);
}

// ── PATCH /api/configuracion — update profile + notification prefs ────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const {
    name, username, bio, website, location,
    notifCorreos, notifComentarios, notifLikes, notifSeguidores, notifPropuestas,
  } = body;

  // Validate username uniqueness if provided
  if (username !== undefined) {
    const trimmed = String(username).trim().toLowerCase();
    if (trimmed.length < 3)
      return NextResponse.json({ error: "El usuario debe tener al menos 3 caracteres" }, { status: 400 });
    if (!/^[a-z0-9_-]+$/.test(trimmed))
      return NextResponse.json({ error: "Solo letras, números, guion y guion bajo" }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: { username: trimmed, NOT: { id: session.user.id } },
    });
    if (existing)
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
  }

  const data: Record<string, unknown> = {};

  if (name      !== undefined) data.name      = String(name).trim()      || null;
  if (username  !== undefined) data.username  = String(username).trim().toLowerCase() || null;
  if (bio       !== undefined) data.bio       = String(bio).trim()       || null;
  if (website   !== undefined) data.website   = String(website).trim()   || null;
  if (location  !== undefined) data.location  = String(location).trim()  || null;

  if (notifCorreos     !== undefined) data.notifCorreos     = Boolean(notifCorreos);
  if (notifComentarios !== undefined) data.notifComentarios = Boolean(notifComentarios);
  if (notifLikes       !== undefined) data.notifLikes       = Boolean(notifLikes);
  if (notifSeguidores  !== undefined) data.notifSeguidores  = Boolean(notifSeguidores);
  if (notifPropuestas  !== undefined) data.notifPropuestas  = Boolean(notifPropuestas);

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const updated = await prisma.user.update({
    where:  { id: session.user.id },
    data,
    select: { id: true, name: true, username: true },
  });

  return NextResponse.json(updated);
}
