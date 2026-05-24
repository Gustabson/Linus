import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug, isUniqueViolation } from "@/lib/api-helpers";
import type { TreeVisibility, ContentType } from "@prisma/client";

const VALID_TYPES:        ContentType[]    = ["KERNEL", "MODULE", "RESOURCE"];
const VALID_VISIBILITIES: TreeVisibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];

const TITLE_MAX       = 120;
const DESCRIPTION_MAX = 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { title, description, language, visibility, contentType } = body;
  if (!title?.trim()) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  if (String(title).length > TITLE_MAX)
    return NextResponse.json({ error: `Título demasiado largo (máximo ${TITLE_MAX})` }, { status: 400 });
  if (description != null && String(description).length > DESCRIPTION_MAX)
    return NextResponse.json({ error: `Descripción demasiado larga (máximo ${DESCRIPTION_MAX})` }, { status: 400 });

  const resolvedType: ContentType =
    VALID_TYPES.includes(contentType) ? contentType : "KERNEL";
  const resolvedVisibility: TreeVisibility =
    VALID_VISIBILITIES.includes(visibility) ? visibility : "PUBLIC";
  const slugExists = (s: string) =>
    prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean);

  // Retry up to 5 times to handle the slug uniqueness race condition (B1 in uniqueSlug docs)
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(title, slugExists);
    try {
      const tree = await prisma.documentTree.create({
        data: {
          slug,
          title:       title.trim(),
          description: description?.trim() || null,
          language:    language ?? "es",
          visibility:  resolvedVisibility,
          contentType: resolvedType,
          forkDepth:   0,
          ownerId:     session.user.id,
        },
      });

      await prisma.treeMembership.create({
        data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
      });

      return NextResponse.json({ slug: tree.slug, id: tree.id });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // slug collision — retry with a new suffix
    }
  }

  return NextResponse.json({ error: "No se pudo generar un slug único" }, { status: 500 });
}
