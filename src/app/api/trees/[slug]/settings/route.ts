import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
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

  await writeLedgerEntry({
    eventType:    "TREE_ARCHIVED",
    subjectId:    tree.id,
    subjectType:  "tree",
    eventPayload: { treeId: tree.id, title: tree.title, action: "deleted" },
    actorId:      session.user.id,
  });

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
    await writeLedgerEntry({
      eventType:    "TREE_ARCHIVED",
      subjectId:    tree.id,
      subjectType:  "tree",
      eventPayload: { treeId: tree.id },
      actorId:      session.user.id,
    });
    return NextResponse.json({ ok: true });
  }

  // Regenerate slug only if title changed
  let newSlug = tree.slug;
  if (title && title.trim() !== tree.title) {
    newSlug = await uniqueSlug(title, async (s) => {
      if (s === tree.slug) return false; // keep own slug if available
      return prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean);
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

  if (visibility && visibility !== tree.visibility) {
    await writeLedgerEntry({
      eventType:    "TREE_VISIBILITY_CHANGED",
      subjectId:    tree.id,
      subjectType:  "tree",
      eventPayload: { from: tree.visibility, to: visibility },
      actorId:      session.user.id,
    });
  }

  return NextResponse.json({ slug: updated.slug });
}
