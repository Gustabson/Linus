import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug, parseBody } from "@/lib/api-helpers";
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
  const { title, description, visibility, contentType, archived } = body;

  if (title != null && String(title).length > TITLE_MAX)
    return NextResponse.json({ error: `Título demasiado largo (máximo ${TITLE_MAX})` }, { status: 400 });
  if (description != null && String(description).length > DESCRIPTION_MAX)
    return NextResponse.json({ error: `Descripción demasiado larga (máximo ${DESCRIPTION_MAX})` }, { status: 400 });
  if (visibility != null && !VALID_VISIBILITIES.includes(visibility as TreeVisibility))
    return NextResponse.json({ error: "Visibilidad inválida" }, { status: 400 });
  if (contentType != null && !VALID_TYPES.includes(contentType as ContentType))
    return NextResponse.json({ error: "Tipo de contenido inválido" }, { status: 400 });

  if (archived) {
    await prisma.documentTree.update({
      where: { id: tree.id },
      data:  { visibility: "PRIVATE" },
    });
    return NextResponse.json({ ok: true });
  }

  // Regenerate slug only if title changed
  let newSlug = tree.slug;
  if (title && title.trim() !== tree.title) {
    newSlug = await uniqueSlug(title, async (s) => {
      const existing = await prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } });
      return existing !== null && existing.id !== tree.id;
    });
  }

  const updated = await prisma.documentTree.update({
    where: { id: tree.id },
    data: {
      title:       title?.trim()                        ?? tree.title,
      description: description?.trim() || null,
      visibility:  (visibility  as TreeVisibility)      ?? tree.visibility,
      contentType: (contentType as ContentType)         ?? tree.contentType,
      slug:        newSlug,
    },
  });

  return NextResponse.json({ slug: updated.slug });
}
