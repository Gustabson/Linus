import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, parseBody, safeString } from "@/lib/api-helpers";

const DOCUMENT_TITLE_MAX = 200;

type Params = { params: Promise<{ slug: string; docSlug: string }> };

/**
 * PATCH /api/trees/[slug]/[docSlug]
 * Renames the document (title only — slug stays unchanged to avoid broken links).
 * Only the tree owner can rename.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug, docSlug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where:  { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true },
  });
  if (!doc)
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const title = safeString(body.title, DOCUMENT_TITLE_MAX);
  if (!title)
    return NextResponse.json({ error: `El título debe tener entre 1 y ${DOCUMENT_TITLE_MAX} caracteres` }, { status: 400 });

  await prisma.document.update({ where: { id: doc.id }, data: { title } });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/trees/[slug]/[docSlug]
 * Deletes a document and all its versions/sections (cascade).
 * Only the tree owner can delete documents.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug, docSlug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true, contentType: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (tree.contentType !== "KERNEL")
    return NextResponse.json({ error: "El documento principal de un módulo o recurso no se puede eliminar" }, { status: 400 });

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true },
  });
  if (!doc)
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
