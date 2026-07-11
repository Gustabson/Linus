import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getOwnedTree, unauthorized, forbidden, parseBody, safeHttpUrl, safeString } from "@/lib/api-helpers";
import type { ExtensionType } from "@prisma/client";

const EXTENSION_TYPES: ExtensionType[] = ["LINK", "APP", "IMAGE", "VIDEO", "FILE", "TOOL"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await getOwnedTree(slug, session.user.id);
  if (!tree) return forbidden();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const type = EXTENSION_TYPES.includes(body.type as ExtensionType) ? body.type as ExtensionType : "LINK";
  const title = safeString(body.title, 200);
  const description = body.description == null || body.description === "" ? null : safeString(body.description, 2_000);
  const url = body.url == null || body.url === "" ? null : safeHttpUrl(body.url);
  const imageUrl = body.imageUrl == null || body.imageUrl === "" ? null : safeHttpUrl(body.imageUrl);
  if (!title) return NextResponse.json({ error: "Título requerido (máximo 200 caracteres)" }, { status: 400 });
  if (body.description != null && body.description !== "" && !description)
    return NextResponse.json({ error: "Descripción inválida" }, { status: 400 });
  if (body.url != null && body.url !== "" && !url)
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  if (body.imageUrl != null && body.imageUrl !== "" && !imageUrl)
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });

  const ext = await prisma.treeExtension.create({
    data: {
      treeId:      tree.id,
      authorId:    session.user.id,
      type:        type ?? "LINK",
      title,
      description,
      url,
      imageUrl,
    },
    include: { author: { select: { name: true, image: true } } },
  });

  return NextResponse.json(ext);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug }        = await params;
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const extensionId = safeString(body.extensionId, 100);
  if (!extensionId) return NextResponse.json({ error: "extensionId requerido" }, { status: 400 });

  const ext = await prisma.treeExtension.findUnique({
    where:  { id: extensionId },
    select: { id: true, treeId: true, authorId: true, tree: { select: { ownerId: true, slug: true } } },
  });

  if (!ext || ext.tree.slug !== slug)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Either the author or the tree owner can delete an extension
  const canDelete = ext.authorId === session.user.id || ext.tree.ownerId === session.user.id;
  if (!canDelete) return forbidden();

  await prisma.treeExtension.delete({ where: { id: extensionId } });
  return NextResponse.json({ ok: true });
}
