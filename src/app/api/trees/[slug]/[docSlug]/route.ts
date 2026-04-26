import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; docSlug: string }> };

/**
 * DELETE /api/trees/[slug]/[docSlug]
 * Deletes a document and all its versions/sections (cascade).
 * Only the tree owner can delete documents.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true },
  });
  if (!doc)
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
