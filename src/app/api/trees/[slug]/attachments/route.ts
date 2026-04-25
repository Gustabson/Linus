import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const kernel = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, contentType: true },
  });

  if (!kernel || kernel.contentType !== "KERNEL" || kernel.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { contentId } = await req.json();
  if (!contentId)
    return NextResponse.json({ error: "contentId requerido" }, { status: 400 });

  const content = await prisma.documentTree.findUnique({
    where: { id: contentId },
    select: { id: true, contentType: true, title: true },
  });

  if (!content || content.contentType === "KERNEL")
    return NextResponse.json({ error: "Solo se pueden adjuntar módulos o recursos" }, { status: 400 });

  const attachment = await prisma.treeAttachment.upsert({
    where: { kernelId_contentId: { kernelId: kernel.id, contentId } },
    create: { kernelId: kernel.id, contentId, addedById: session.user.id },
    update: {},
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

  await writeLedgerEntry({
    eventType: "CONTENT_ATTACHED",
    subjectId: kernel.id,
    subjectType: "tree",
    eventPayload: { contentId, contentTitle: content.title, contentType: content.contentType },
    actorId: session.user.id,
  });

  return NextResponse.json(attachment);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const kernel = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, contentType: true },
  });

  if (!kernel || kernel.contentType !== "KERNEL" || kernel.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { contentId } = await req.json();

  await prisma.treeAttachment.deleteMany({
    where: { kernelId: kernel.id, contentId },
  });

  await writeLedgerEntry({
    eventType: "CONTENT_DETACHED",
    subjectId: kernel.id,
    subjectType: "tree",
    eventPayload: { contentId },
    actorId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
