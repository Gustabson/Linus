import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RESERVED_USERNAMES = new Set([
  "explorar", "dashboard", "buscar", "propuestas", "ledger", "nuevo",
  "bienvenida", "kernel", "api", "login", "t", "u", "admin", "preview",
  "configuracion", "historial", "about", "settings", "ayuda",
]);

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ available: false });

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return NextResponse.json({ available: false });
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
