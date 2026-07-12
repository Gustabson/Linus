import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSession, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_SIZE = 2 * 1024 * 1024;
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function hasImageSignature(ext: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ext === "jpg" || ext === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (ext === "gif") return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
  if (ext === "webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

function isOwnedAvatar(url: string | null, userId: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname.endsWith(".public.blob.vercel-storage.com")
      && parsed.pathname.startsWith(`/avatars/${encodeURIComponent(userId)}`);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const announcedSize = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(announcedSize) && announcedSize > 3 * 1024 * 1024)
    return NextResponse.json({ error: "La imagen no puede superar 2 MB" }, { status: 413 });
  const limited = await enforceRateLimit({
    action: "avatar:upload", userId: session.user.id, limit: 10, windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const formData = await req.formData().catch(() => null);
  if (!formData)
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const file = formData.get("image") as File | null;
  if (!file)
    return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_SIZE)
    return NextResponse.json({ error: "La imagen debe pesar entre 1 byte y 2 MB" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TO_MIME[ext];
  if (!contentType)
    return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG, GIF o WebP." }, { status: 400 });

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasImageSignature(ext, header))
    return NextResponse.json({ error: "El contenido del archivo no es una imagen válida" }, { status: 400 });

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });
  const blob = await put(`avatars/${session.user.id}/${randomUUID()}.${ext}`, file, {
    access: "public",
    contentType,
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: blob.url },
  });

  const previousImage = previous?.image ?? null;
  if (isOwnedAvatar(previousImage, session.user.id) && previousImage !== blob.url) {
    try { await del(previousImage); } catch { /* Blob cleanup is best effort. */ }
  }

  return NextResponse.json({ url: blob.url });
}
