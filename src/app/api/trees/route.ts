import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { slugify } from "@/lib/utils";
import type { TreeVisibility } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { title, description, language, visibility, isKernel } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.documentTree.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const tree = await prisma.documentTree.create({
    data: {
      slug,
      title: title.trim(),
      description: description?.trim() || null,
      language: language ?? "es",
      visibility: (visibility as TreeVisibility) ?? "PUBLIC",
      isKernel: isKernel === true,
      forkDepth: 0,
      ownerId: session.user.id,
    },
  });

  await prisma.treeMembership.create({
    data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
  });

  await writeLedgerEntry({
    eventType: "TREE_CREATED",
    subjectId: tree.id,
    subjectType: "tree",
    eventPayload: { treeId: tree.id, title: tree.title, slug: tree.slug },
    actorId: session.user.id,
  });

  return NextResponse.json({ slug: tree.slug });
}
