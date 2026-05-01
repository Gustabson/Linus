import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug } from "@/lib/api-helpers";
import { copySectionFields } from "@/lib/sections";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { treeId, targetKernelId } = await req.json();
  if (!treeId) return NextResponse.json({ error: "treeId requerido" }, { status: 400 });

  const source = await prisma.documentTree.findUnique({
    where: { id: treeId },
    include: {
      documents: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sections: true },
          },
        },
      },
      attachments: { select: { contentId: true } },
    },
  });

  if (!source || source.visibility === "PRIVATE")
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });

  if (targetKernelId) {
    const targetKernel = await prisma.documentTree.findUnique({
      where:  { id: targetKernelId },
      select: { ownerId: true, contentType: true },
    });
    if (!targetKernel || targetKernel.ownerId !== session.user.id || targetKernel.contentType !== "KERNEL")
      return NextResponse.json({ error: "Kernel destino inválido" }, { status: 400 });
  }

  const slug = await uniqueSlug(
    `${source.title} fork ${session.user.name ?? "user"}`,
    (s) => prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean)
  );

  const newTree = await prisma.$transaction(async (tx) => {
    const tree = await tx.documentTree.create({
      data: {
        slug,
        title:        `${source.title} (fork)`,
        description:  source.description,
        language:     source.language,
        visibility:   "PUBLIC",
        contentType:  source.contentType,
        forkDepth:    source.forkDepth + 1,
        ownerId:      session.user.id,
        parentTreeId: source.id,
      },
    });

    await tx.treeMembership.create({
      data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
    });

    if (source.contentType === "KERNEL") {
      for (const doc of source.documents) {
        const latest = doc.versions[0];
        if (!latest) continue;

        const newDoc = await tx.document.create({
          data: { treeId: tree.id, slug: doc.slug, title: doc.title },
        });

        const newVersion = await tx.documentVersion.create({
          data: {
            documentId:      newDoc.id,
            authorId:        session.user.id,
            status:          "DRAFT",
            commitMessage:   `Fork desde "${source.title}"`,
            parentVersionId: latest.id,
            sections: {
              create: latest.sections.map((s) => ({
                ...copySectionFields(s),
                richTextContent: s.richTextContent ?? {},
              })),
            },
          },
        });

        await tx.document.update({
          where: { id: newDoc.id },
          data:  { currentVersionId: newVersion.id },
        });
      }

      // Copy module/resource attachments from source kernel
      for (const att of source.attachments) {
        await tx.treeAttachment.create({
          data: { kernelId: tree.id, contentId: att.contentId, addedById: session.user.id },
        });
      }
    }

    // Auto-attach if forking a MODULE/RESOURCE into a chosen kernel
    if (targetKernelId && source.contentType !== "KERNEL") {
      await tx.treeAttachment.upsert({
        where:  { kernelId_contentId: { kernelId: targetKernelId, contentId: tree.id } },
        create: { kernelId: targetKernelId, contentId: tree.id, addedById: session.user.id },
        update: {},
      });
    }

    return tree;
  });

  // Notify original tree owner
  const forkOwnerUsername = session.user.username ?? session.user.name ?? session.user.id;
  await createNotification({
    type:        "NEW_FORK",
    recipientId: source.ownerId,
    actorId:     session.user.id,
    link:        `/${forkOwnerUsername}/${newTree.slug}`,
  });

  return NextResponse.json({ slug: newTree.slug });
}
