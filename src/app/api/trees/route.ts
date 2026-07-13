import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  isUniqueViolation,
  parseBody,
  rejectCrossOrigin,
  safeHttpUrl,
  safeString,
  unauthorized,
  uniqueSlug,
} from "@/lib/api-helpers";
import type { TreeVisibility, ContentType, ResourceKind } from "@prisma/client";

const VALID_TYPES:        ContentType[]    = ["KERNEL", "MODULE", "RESOURCE"];
const VALID_VISIBILITIES: TreeVisibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];
const VALID_RESOURCE_KINDS: ResourceKind[] = ["EDITOR", "LINK", "APP", "IMAGE", "VIDEO", "FILE", "REFERENCE"];

const TITLE_MAX       = 120;
const DESCRIPTION_MAX = 1000;

export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req, 16_000);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const title = safeString(body.title, TITLE_MAX);
  if (!title) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  const description = body.description == null || body.description === ""
    ? null
    : safeString(body.description, DESCRIPTION_MAX);
  if (body.description != null && body.description !== "" && !description)
    return NextResponse.json({ error: `Descripción inválida (máximo ${DESCRIPTION_MAX})` }, { status: 400 });
  const language = body.language == null ? "es" : safeString(body.language, 10);
  if (!language) return NextResponse.json({ error: "Idioma inválido" }, { status: 400 });

  const typeCandidate = body.contentType ?? "KERNEL";
  if (typeof typeCandidate !== "string" || !VALID_TYPES.includes(typeCandidate as ContentType))
    return NextResponse.json({ error: "Tipo de contenido inválido" }, { status: 400 });
  const resolvedType = typeCandidate as ContentType;
  const visibilityCandidate = body.visibility ?? "PUBLIC";
  if (typeof visibilityCandidate !== "string" || !VALID_VISIBILITIES.includes(visibilityCandidate as TreeVisibility))
    return NextResponse.json({ error: "Visibilidad inválida" }, { status: 400 });
  const resolvedVisibility = visibilityCandidate as TreeVisibility;
  if (resolvedType === "RESOURCE" && body.resourceKind != null &&
      (typeof body.resourceKind !== "string" || !VALID_RESOURCE_KINDS.includes(body.resourceKind as ResourceKind)))
    return NextResponse.json({ error: "Formato de recurso inválido" }, { status: 400 });
  const resourceKind: ResourceKind | null = resolvedType === "RESOURCE"
    ? ((body.resourceKind as ResourceKind | undefined) ?? "EDITOR")
    : null;
  const resourceUrl = resolvedType !== "RESOURCE" || body.resourceUrl == null || body.resourceUrl === ""
    ? null
    : safeHttpUrl(body.resourceUrl);
  if (resolvedType === "RESOURCE" && resourceKind !== "EDITOR" && resourceKind !== "REFERENCE" && !resourceUrl)
    return NextResponse.json({ error: "Los recursos externos necesitan un archivo o una URL válida" }, { status: 400 });
  const slugExists = (s: string) =>
    prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean);

  // Retry para resolver la race condition de uniqueSlug
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(title, slugExists);
    try {
      const tree = await prisma.$transaction(async (tx) => {
        const created = await tx.documentTree.create({
          data: {
            slug,
            title,
            description,
            language,
            visibility:  resolvedVisibility,
            contentType: resolvedType,
            resourceKind,
            resourceUrl: resourceKind === "EDITOR" ? null : resourceUrl,
            forkDepth:   0,
            ownerId:     session.user.id,
          },
        });
        await tx.treeMembership.create({
          data: { treeId: created.id, userId: session.user.id, role: "OWNER" },
        });
        return created;
      });

      return NextResponse.json({ slug: tree.slug, id: tree.id });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // slug collision — retry with a new suffix
    }
  }

  return NextResponse.json({ error: "No se pudo generar un slug único" }, { status: 500 });
}
