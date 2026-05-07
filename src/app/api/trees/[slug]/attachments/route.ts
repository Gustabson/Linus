import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getOwnedKernel, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const kernel = await getOwnedKernel(slug, session.user.id);
  if (!kernel) return forbidden();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { contentId } = body;
  if (!contentId) return NextResponse.json({ error: "contentId requerido" }, { status: 400 });

  const content = await prisma.documentTree.findUnique({
    where:  { id: contentId },
    select: { id: true, contentType: true, title: true },
  });

  if (!content || content.contentType === "KERNEL")
    return NextResponse.json({ error: "Solo se pueden adjuntar módulos o recursos" }, { status: 400 });

  const attachment = await prisma.treeAttachment.upsert({
    where:   { kernelId_contentId: { kernelId: kernel.id, contentId } },
    create:  { kernelId: kernel.id, contentId, addedById: session.user.id },
    update:  {},
    include: {
      content: {
        select: {
          id: true, slug: true, title: true, contentType: true,
          owner: { select: { name: true, username: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
    },
  });

  return NextResponse.json(attachment);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const kernel = await getOwnedKernel(slug, session.user.id);
  if (!kernel) return forbidden();

  const delBody = await parseBody(req);
  if (!delBody) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { contentId } = delBody;

  await prisma.treeAttachment.deleteMany({
    where: { kernelId: kernel.id, contentId },
  });

  return NextResponse.json({ ok: true });
}
