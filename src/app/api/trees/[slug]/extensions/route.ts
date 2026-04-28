import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getOwnedTree, unauthorized, forbidden } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await getOwnedTree(slug, session.user.id);
  if (!tree) return forbidden();

  const { type, title, description, url, imageUrl } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const ext = await prisma.treeExtension.create({
    data: {
      treeId:      tree.id,
      authorId:    session.user.id,
      type:        type ?? "LINK",
      title:       title.trim(),
      description: description?.trim() || null,
      url:         url?.trim()         || null,
      imageUrl:    imageUrl?.trim()    || null,
    },
    include: { author: { select: { name: true, image: true } } },
  });

  return NextResponse.json(ext);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug }        = await params;
  const { extensionId } = await req.json();

  const ext = await prisma.treeExtension.findUnique({
    where:  { id: extensionId },
    select: { id: true, treeId: true, authorId: true, tree: { select: { ownerId: true, slug: true } } },
  });

  if (!ext || ext.tree.slug !== slug)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Either the author or the tree owner can delete an extension
  const canDelete = ext.authorId === session.user.id || ext.tree.ownerId === session.user.id;
  if (!canDelete) return forbidden();

  await prisma.treeExtension.delete({ where: { id: extensionId } });
  return NextResponse.json({ ok: true });
}
