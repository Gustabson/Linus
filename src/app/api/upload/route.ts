import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSession, parseBody, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import { isOwnedCommentUpload } from "@/lib/comments";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_SIZE_MB = 10;

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "mp4", "webm", "zip", "txt", "csv", "doc", "docx", "pptx",
]);

const COMMENT_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "pdf", "mp4", "webm", "doc", "docx",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf",
  mp4: "video/mp4", webm: "video/webm",
  zip: "application/zip",
  txt: "text/plain", csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function hasExpectedSignature(ext: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  switch (ext) {
    case "jpg":
    case "jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "png": return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "gif": return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
    case "webp": return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "pdf": return ascii(0, 5) === "%PDF-";
    case "mp4": return ascii(4, 8) === "ftyp";
    case "webm": return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "doc": return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    case "docx": {
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
      if (!isZip) return false;
      // ZIP directory entry names are stored verbatim even when contents are compressed.
      const archiveText = new TextDecoder("latin1").decode(bytes);
      return archiveText.includes("[Content_Types].xml") && archiveText.includes("word/");
    }
    default: return true;
  }
}

export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const announcedSize = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(announcedSize) && announcedSize > (MAX_SIZE_MB + 1) * 1024 * 1024)
    return NextResponse.json({ error: `Máximo ${MAX_SIZE_MB}MB` }, { status: 413 });

  const formData = await req.formData().catch(() => null);
  if (!formData)
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  const purpose = formData.get("purpose") === "comment" ? "comment" : "general";
  const limited = await enforceRateLimit({
    action: `upload:${purpose}`,
    userId: session.user.id,
    limit: purpose === "comment" ? 20 : 50,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  if (!file)
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return NextResponse.json({ error: `Máximo ${MAX_SIZE_MB}MB` }, { status: 400 });
  if (file.size === 0)
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TO_MIME[ext];
  if (!ALLOWED_EXTENSIONS.has(ext) || !contentType)
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  if (purpose === "comment" && !COMMENT_EXTENSIONS.has(ext))
    return NextResponse.json({ error: "Este tipo de archivo no se puede adjuntar a un comentario" }, { status: 400 });

  if (purpose === "comment") {
    const bytes = new Uint8Array(await (ext === "docx" ? file : file.slice(0, 16)).arrayBuffer());
    if (!hasExpectedSignature(ext, bytes))
      return NextResponse.json({ error: "El contenido del archivo no coincide con su extensión" }, { status: 400 });
  }

  const filename = purpose === "comment"
    ? `comments/${encodeURIComponent(session.user.id)}/${Date.now()}-${randomUUID()}.${ext}`
    : `${session.user.id}-${Date.now()}-${randomUUID()}.${ext}`;
  const blob = await put(filename, file, { access: "public", contentType });

  return NextResponse.json({
    url: blob.url,
    name: file.name.slice(0, 255),
    type: contentType,
    size: file.size,
  });
}

export async function DELETE(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "upload:delete", userId: session.user.id, limit: 40, windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await parseBody(req, 4_000);
  if (!body || !isOwnedCommentUpload(body.url, session.user.id))
    return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });

  const referenced = await prisma.postComment.findFirst({
    where: { attachmentUrl: body.url },
    select: { id: true },
  });
  if (referenced) {
    return NextResponse.json(
      { error: "No se puede eliminar un archivo que ya fue publicado" },
      { status: 409 },
    );
  }

  await del(body.url);
  return NextResponse.json({ ok: true });
}
