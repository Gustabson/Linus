import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getOwnedTree, unauthorized, forbidden, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";
import { canAttachTree } from "@/lib/tree-hierarchy";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const container = await getOwnedTree(slug, session.user.id);
  if (!container || container.contentType === "RESOURCE") return forbidden();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const contentId = safeString(body.contentId, 100);
  if (!contentId) return NextResponse.json({ error: "contentId requerido" }, { status: 400 });

  const content = await prisma.documentTree.findUnique({
    where:  { id: contentId },
    select: { id: true, contentType: true, title: true, visibility: true, ownerId: true },
  });

  const allowed = content ? canAttachTree(container.contentType, content.contentType) : false;
  if (!content || !allowed) {
    const message = container.contentType === "MODULE"
      ? "A un módulo sólo se le pueden adjuntar recursos"
      : "A un kernel sólo se le pueden adjuntar módulos o recursos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Non-public content can only be attached by its owner.
  if (content.visibility !== "PUBLIC" && content.ownerId !== session.user.id)
    return NextResponse.json({ error: "No tenés acceso a ese contenido" }, { status: 403 });

  const attachment = await prisma.treeAttachment.upsert({
    where:   { kernelId_contentId: { kernelId: container.id, contentId } },
    create:  { kernelId: container.id, contentId, addedById: session.user.id },
    update:  {},
    include: {
      content: {
        select: {
          id: true, slug: true, title: true, description: true, contentType: true,
          resourceKind: true, resourceUrl: true,
          owner: { select: { name: true, username: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
    },
  });

  return NextResponse.json(attachment);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const container = await getOwnedTree(slug, session.user.id);
  if (!container || container.contentType === "RESOURCE") return forbidden();

  const delBody = await parseBody(req);
  if (!delBody) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const contentId = safeString(delBody.contentId, 100);
  if (!contentId) return NextResponse.json({ error: "contentId requerido" }, { status: 400 });

  await prisma.treeAttachment.deleteMany({
    where: { kernelId: container.id, contentId },
  });

  return NextResponse.json({ ok: true });
}
