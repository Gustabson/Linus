import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { slugify } from "@/lib/utils";
import type { TreeVisibility, ContentType } from "@prisma/client";

export async function PATCH(
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

  const body = await req.json();
  const { title, description, visibility, contentType, archived } = body;

  // Handle archive
  if (archived) {
    await prisma.documentTree.update({
      where: { id: tree.id },
      data: { visibility: "PRIVATE" },
    });
    await writeLedgerEntry({
      eventType: "TREE_ARCHIVED",
      subjectId: tree.id,
      subjectType: "tree",
      eventPayload: { treeId: tree.id },
      actorId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  }

  // Build new slug if title changed
  let newSlug = tree.slug;
  if (title && title.trim() !== tree.title) {
    const base = slugify(title);
    newSlug = base;
    let attempt = 0;
    while (
      newSlug !== tree.slug &&
      (await prisma.documentTree.findUnique({ where: { slug: newSlug } }))
    ) {
      attempt++;
      newSlug = `${base}-${attempt}`;
    }
  }

  const updated = await prisma.documentTree.update({
    where: { id: tree.id },
    data: {
      title: title?.trim() ?? tree.title,
      description: description?.trim() || null,
      visibility: (visibility as TreeVisibility) ?? tree.visibility,
      contentType: (contentType as ContentType) ?? tree.contentType,
      slug: newSlug,
    },
  });

  if (visibility && visibility !== tree.visibility) {
    await writeLedgerEntry({
      eventType: "TREE_VISIBILITY_CHANGED",
      subjectId: tree.id,
      subjectType: "tree",
      eventPayload: { from: tree.visibility, to: visibility },
      actorId: session.user.id,
    });
  }

  return NextResponse.json({ slug: updated.slug });
}
