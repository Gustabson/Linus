import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({ where: { slug } });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { type, title, description, url, imageUrl } = await req.json();
  if (!title?.trim())
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const ext = await prisma.treeExtension.create({
    data: {
      treeId: tree.id,
      authorId: session.user.id,
      type: type ?? "LINK",
      title: title.trim(),
      description: description?.trim() || null,
      url: url?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    },
    include: { author: { select: { name: true, image: true } } },
  });

  return NextResponse.json(ext);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const { extensionId } = await req.json();

  const ext = await prisma.treeExtension.findUnique({ where: { id: extensionId } });
  if (!ext || ext.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.treeExtension.delete({ where: { id: extensionId } });
  return NextResponse.json({ ok: true });
}
