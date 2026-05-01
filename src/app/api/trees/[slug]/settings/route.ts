import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug } from "@/lib/api-helpers";
import type { TreeVisibility, ContentType } from "@prisma/client";

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

  const { title, description, visibility, contentType, archived } = await req.json();

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
