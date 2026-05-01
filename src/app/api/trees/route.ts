import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug } from "@/lib/api-helpers";
import type { TreeVisibility, ContentType } from "@prisma/client";

const VALID_TYPES: ContentType[] = ["KERNEL", "MODULE", "RESOURCE"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { title, description, language, visibility, contentType } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });

  const resolvedType: ContentType = VALID_TYPES.includes(contentType) ? contentType : "KERNEL";

  const slug = await uniqueSlug(title, (s) =>
    prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean)
  );

  const tree = await prisma.documentTree.create({
    data: {
      slug,
      title:       title.trim(),
      description: description?.trim() || null,
      language:    language ?? "es",
      visibility:  (visibility as TreeVisibility) ?? "PUBLIC",
      contentType: resolvedType,
      forkDepth:   0,
      ownerId:     session.user.id,
    },
  });

  await prisma.treeMembership.create({
    data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
  });

  return NextResponse.json({ slug: tree.slug, id: tree.id });
}
