import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { isValidHex, validateTheme } from "@/lib/theme";

// ── GET /api/configuracion ────────────────────────────────────────────────────
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
      themeMode:     true,
      themeBg:       true,
      themeSurface:  true,
      themeBorder:   true,
      themeText:     true,
      themePrimary:  true,
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

// ── PATCH /api/configuracion ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const {
    name, username, bio, website, location,
    themeMode, themeBg, themeSurface, themeBorder, themeText, themePrimary,
    notifCorreos, notifComentarios, notifLikes, notifSeguidores, notifPropuestas,
  } = body;

  // Validate username
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

  // Validate custom theme
  if (themeMode === "custom") {
    const hexFields = { themeBg, themeSurface, themeBorder, themeText, themePrimary };
    for (const [key, val] of Object.entries(hexFields)) {
      if (val !== undefined && val !== null && !isValidHex(String(val)))
        return NextResponse.json({ error: `Color inválido en ${key}` }, { status: 400 });
    }
    if (themeBg && themeText) {
      const err = validateTheme({
        themeBg:      String(themeBg),
        themeSurface: String(themeSurface ?? themeBg),
        themeBorder:  String(themeBorder ?? "#e5e7eb"),
        themeText:    String(themeText),
        themePrimary: String(themePrimary ?? "#15803d"),
      });
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};

  if (name      !== undefined) data.name      = String(name).trim()      || null;
  if (username  !== undefined) data.username  = String(username).trim().toLowerCase() || null;
  if (bio       !== undefined) data.bio       = String(bio).trim()       || null;
  if (website   !== undefined) data.website   = String(website).trim()   || null;
  if (location  !== undefined) data.location  = String(location).trim()  || null;

  if (themeMode    !== undefined) data.themeMode    = String(themeMode);
  if (themeBg      !== undefined) data.themeBg      = themeBg      ? String(themeBg)      : null;
  if (themeSurface !== undefined) data.themeSurface = themeSurface ? String(themeSurface) : null;
  if (themeBorder  !== undefined) data.themeBorder  = themeBorder  ? String(themeBorder)  : null;
  if (themeText    !== undefined) data.themeText    = themeText    ? String(themeText)    : null;
  if (themePrimary !== undefined) data.themePrimary = themePrimary ? String(themePrimary) : null;

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
    select: { id: true, name: true, username: true, themeMode: true },
  });

  return NextResponse.json(updated);
}
