import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData)
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const file = formData.get("image") as File | null;
  if (!file)
    return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "La imagen no puede superar 2 MB" }, { status: 400 });

  const ext  = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const blob = await put(`avatars/${session.user.id}.${ext}`, file, {
    access:          "public",
    addRandomSuffix: false, // deterministic URL — overwrites previous avatar
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { image: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}
