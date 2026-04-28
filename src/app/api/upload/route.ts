import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-helpers";

const MAX_SIZE_MB = 10;

// Validate by extension (not client-supplied MIME which can be forged)
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "pdf",
  "mp4", "webm",
  "zip",
  "txt", "csv",
  "docx", "pptx",
]);

// Canonical content-type per extension (server-assigned, not client-trusted)
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif",  webp: "image/webp", svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",  webm: "video/webm",
  zip: "application/zip",
  txt: "text/plain", csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;

  if (!file)
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });

  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return NextResponse.json({ error: `Máximo ${MAX_SIZE_MB}MB` }, { status: 400 });

  // Validate by extension — file.type is client-supplied and untrustworthy
  const ext         = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TO_MIME[ext];
  if (!ALLOWED_EXTENSIONS.has(ext) || !contentType)
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });

  const filename = `${session.user.id}-${Date.now()}.${ext}`;

  const blob = await put(filename, file, { access: "public", contentType });

  return NextResponse.json({ url: blob.url, name: file.name, type: contentType });
}
