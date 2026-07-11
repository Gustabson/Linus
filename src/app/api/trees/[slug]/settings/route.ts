import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug, parseBody, safeString } from "@/lib/api-helpers";
import type { TreeVisibility, ContentType } from "@prisma/client";

const VALID_TYPES:        ContentType[]    = ["KERNEL", "MODULE", "RESOURCE"];
const VALID_VISIBILITIES: TreeVisibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];

const TITLE_MAX       = 120;
const DESCRIPTION_MAX = 1000;

// ── DELETE — permanently removes a tree ──────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true, title: true, _count: { select: { forks: true } } },
  });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  // Detach forks: they keep all content, just lose the parent reference
  if (tree._count.forks > 0) {
    await prisma.documentTree.updateMany({
      where: { parentTreeId: tree.id },
      data:  { parentTreeId: null },
    });
  }

  await prisma.documentTree.delete({ where: { id: tree.id } });

  return NextResponse.json({ ok: true });
}

// ── PATCH — update tree settings ──────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({ where: { slug } });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const title = body.title === undefined ? undefined : safeString(body.title, TITLE_MAX);
  const description = body.description === undefined
    ? undefined
    : body.description === null || body.description === ""
      ? null
      : safeString(body.description, DESCRIPTION_MAX);
  const visibility = body.visibility as TreeVisibility | undefined;
  const contentType = body.contentType as ContentType | undefined;

  if (body.title !== undefined && !title)
    return NextResponse.json({ error: `Título inválido (máximo ${TITLE_MAX})` }, { status: 400 });
  if (body.description !== undefined && body.description !== null && body.description !== "" && !description)
    return NextResponse.json({ error: `Descripción inválida (máximo ${DESCRIPTION_MAX})` }, { status: 400 });
  if (visibility != null && !VALID_VISIBILITIES.includes(visibility))
    return NextResponse.json({ error: "Visibilidad inválida" }, { status: 400 });
  if (contentType != null && !VALID_TYPES.includes(contentType))
    return NextResponse.json({ error: "Tipo de contenido inválido" }, { status: 400 });
  if (body.archived !== undefined && typeof body.archived !== "boolean")
    return NextResponse.json({ error: "Valor de archivo inválido" }, { status: 400 });

  if (body.archived === true) {
    await prisma.documentTree.update({
      where: { id: tree.id },
      data:  { visibility: "PRIVATE" },
    });
    return NextResponse.json({ ok: true });
  }

  // Regenerate slug only if title changed
  let newSlug = tree.slug;
  if (title && title !== tree.title) {
    newSlug = await uniqueSlug(title, async (s) => {
      const existing = await prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } });
      return existing !== null && existing.id !== tree.id;
    });
  }

  const updated = await prisma.documentTree.update({
    where: { id: tree.id },
    data: {
      title:       title ?? tree.title,
      description: description !== undefined ? description : tree.description,
      visibility:  visibility  ?? tree.visibility,
      contentType: contentType ?? tree.contentType,
      slug:        newSlug,
    },
  });

  return NextResponse.json({ slug: updated.slug });
}
