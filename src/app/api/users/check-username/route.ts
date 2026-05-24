import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const USERNAME_REGEX = /^[a-z0-9_-]{3,32}$/;

const RESERVED_USERNAMES = new Set([
  "explorar", "dashboard", "buscar", "propuestas", "ledger", "nuevo",
  "bienvenida", "kernel", "api", "login", "t", "u", "admin", "preview",
  "configuracion", "historial", "about", "settings", "ayuda",
]);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("username")?.trim().toLowerCase() ?? "";
  if (!raw) return NextResponse.json({ available: false });

  // Reject invalid formats up front — DB is lowercased + regex-validated on write
  if (!USERNAME_REGEX.test(raw)) return NextResponse.json({ available: false });

  if (RESERVED_USERNAMES.has(raw)) return NextResponse.json({ available: false });

  const existing = await prisma.user.findUnique({
    where:  { username: raw },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
