import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, parseBody, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { isValidHex } from "@/lib/theme";
import { buildThemeCookie, THEME_COOKIE_NAME, THEME_COOKIE_NAMES } from "@/lib/theme-config";

// Length caps for text fields — protects DB from megabyte-string spam.
const LIMITS = {
  name:     80,
  username: 32,
  bio:      280,
  website:  200,
  location: 80,
};
const URL_RE = /^https?:\/\//i;

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
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req, 16_000);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const {
    name, username, bio, website, location,
    themeMode, themeBg, themeSurface, themeBorder, themeText, themePrimary,
    themeSidebarBg, themeSidebarText,
    themeKernel, themeModule, themeResource,
    notifCorreos, notifComentarios, notifLikes, notifSeguidores, notifPropuestas,
  } = body;
  const themeChanged = [
    themeMode, themeBg, themeSurface, themeBorder, themeText, themePrimary,
    themeSidebarBg, themeSidebarText, themeKernel, themeModule, themeResource,
  ].some((value) => value !== undefined);

  if (themeMode !== undefined && !["light", "dark", "custom"].includes(String(themeMode)))
    return NextResponse.json({ error: "Modo de tema inválido" }, { status: 400 });

  // Validate username
  if (username !== undefined && username !== null && String(username).trim() !== "") {
    const trimmed = String(username).trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > LIMITS.username)
      return NextResponse.json({ error: `El usuario debe tener entre 3 y ${LIMITS.username} caracteres` }, { status: 400 });
    if (!/^[a-z0-9_-]+$/.test(trimmed))
      return NextResponse.json({ error: "Solo letras, números, guion y guion bajo" }, { status: 400 });
    const RESERVED = new Set([
      "explorar", "dashboard", "buscar", "propuestas", "ledger", "nuevo",
      "bienvenida", "kernel", "api", "login", "t", "u", "admin", "preview",
      "configuracion", "historial", "about", "settings", "ayuda", "correos",
      "feed", "notificaciones", "reset", "v",
    ]);
    if (RESERVED.has(trimmed))
      return NextResponse.json({ error: "Ese nombre de usuario no está disponible" }, { status: 400 });
    const existing = await prisma.user.findFirst({
      where: { username: trimmed, NOT: { id: session.user.id } },
    });
    if (existing)
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
  }

  // Validate length of other text fields
  const lengthChecks: Array<[string, unknown, number]> = [
    ["name", name, LIMITS.name],
    ["bio", bio, LIMITS.bio],
    ["website", website, LIMITS.website],
    ["location", location, LIMITS.location],
  ];
  for (const [key, val, max] of lengthChecks) {
    if (val !== undefined && val !== null && String(val).length > max)
      return NextResponse.json({ error: `${key} es demasiado largo (máximo ${max})` }, { status: 400 });
  }

  // Website must be http(s) if provided — prevents javascript: scheme XSS
  if (website !== undefined && website !== null && String(website).trim() !== "" && !URL_RE.test(String(website).trim()))
    return NextResponse.json({ error: "El sitio web debe empezar con http:// o https://" }, { status: 400 });

  // Validate every supplied theme value on the server. A client can patch
  // custom colors without sending themeMode, so validation cannot depend on it.
  const hexFields = {
    themeBg, themeSurface, themeBorder, themeText, themePrimary,
    themeSidebarBg, themeSidebarText, themeKernel, themeModule, themeResource,
  };
  for (const [key, val] of Object.entries(hexFields)) {
    if (val !== undefined && val !== null && !isValidHex(String(val)))
      return NextResponse.json({ error: `Color inválido en ${key}` }, { status: 400 });
  }

  const notificationFields = { notifCorreos, notifComentarios, notifLikes, notifSeguidores, notifPropuestas };
  for (const [key, val] of Object.entries(notificationFields)) {
    if (val !== undefined && typeof val !== "boolean")
      return NextResponse.json({ error: `Valor inválido en ${key}` }, { status: 400 });
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
  if (themePrimary    !== undefined) data.themePrimary    = themePrimary    ? String(themePrimary)    : null;
  if (themeSidebarBg  !== undefined) data.themeSidebarBg  = themeSidebarBg  ? String(themeSidebarBg)  : null;
  if (themeSidebarText !== undefined) data.themeSidebarText = themeSidebarText ? String(themeSidebarText) : null;
  if (themeKernel   !== undefined) data.themeKernel   = themeKernel   ? String(themeKernel)   : null;
  if (themeModule   !== undefined) data.themeModule   = themeModule   ? String(themeModule)   : null;
  if (themeResource !== undefined) data.themeResource = themeResource ? String(themeResource) : null;

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
    select: {
      id: true,
      name: true,
      username: true,
      themeMode: true,
      themeBg: true,
      themeSurface: true,
      themeBorder: true,
      themeText: true,
      themePrimary: true,
      themeSidebarBg: true,
      themeSidebarText: true,
      themeKernel: true,
      themeModule: true,
      themeResource: true,
    },
  });

  // Purgar caché ISR de la página de configuración y layout raíz
  revalidatePath("/configuracion");
  revalidatePath("/", "layout");

  const response = NextResponse.json(updated);

  if (themeChanged) {
    const payload = buildThemeCookie({
      themeBg:          updated.themeBg          ?? "",
      themeSurface:     updated.themeSurface     ?? "",
      themeBorder:      updated.themeBorder      ?? "",
      themeText:        updated.themeText        ?? "",
      themePrimary:     updated.themePrimary     ?? "",
      themeSidebarBg:   updated.themeSidebarBg   ?? "",
      themeSidebarText: updated.themeSidebarText ?? "",
      themeKernel:      updated.themeKernel      ?? "",
      themeModule:      updated.themeModule      ?? "",
      themeResource:    updated.themeResource    ?? "",
    });
    payload.mode = updated.themeMode;

    response.cookies.set(THEME_COOKIE_NAME, JSON.stringify(payload), {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    for (const name of THEME_COOKIE_NAMES) {
      response.headers.append("Set-Cookie", `${name}=; Path=/configuracion; Max-Age=0; SameSite=Lax`);
      if (name !== THEME_COOKIE_NAME) {
        response.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
      }
    }
  }

  return response;
}
