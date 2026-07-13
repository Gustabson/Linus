import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, uniqueSlug, isUniqueViolation, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";
import { copySectionFields } from "@/lib/sections";
import { createNotification } from "@/lib/notifications";
import { canAttachTree } from "@/lib/tree-hierarchy";

export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await parseBody(req, 4_000);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const treeId = safeString(body.treeId, 100);
  const targetKernelId = body.targetKernelId == null ? null : safeString(body.targetKernelId, 100);
  if (!treeId) return NextResponse.json({ error: "treeId requerido" }, { status: 400 });
  if (body.targetKernelId != null && !targetKernelId)
    return NextResponse.json({ error: "Destino inválido" }, { status: 400 });

  const source = await prisma.documentTree.findUnique({
    where: { id: treeId },
    include: {
      documents: {
        include: {
          versions: {
            where: { status: "PUBLISHED" },
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

  if (source.contentType === "RESOURCE" && source.resourceKind !== "EDITOR") {
    return NextResponse.json(
      { error: "Los recursos externos se adjuntan directamente y no se pueden forkear." },
      { status: 400 }
    );
  }

  // Forks are only 1 level deep: originals can be forked, forks cannot.
  // This keeps the graph flat and queries simple.
  if (source.forkDepth > 0)
    return NextResponse.json(
      { error: "No se puede forkear un fork. Solo se pueden forkear los originales." },
      { status: 400 }
    );

  if (targetKernelId) {
    const targetContainer = await prisma.documentTree.findUnique({
      where:  { id: targetKernelId },
      select: { ownerId: true, contentType: true },
    });
    if (!targetContainer || targetContainer.ownerId !== session.user.id ||
        !canAttachTree(targetContainer.contentType, source.contentType))
      return NextResponse.json({ error: "Destino inválido para este contenido" }, { status: 400 });
  }

  const forkTitle = `${source.title} fork ${session.user.name ?? "user"}`;
  const slugExists = (s: string) =>
    prisma.documentTree.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean);

  // Retry para resolver la race condition de uniqueSlug
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(forkTitle, slugExists);
    try {
      const newTree = await prisma.$transaction(async (tx) => {
        const tree = await tx.documentTree.create({
          data: {
            slug,
            title:        `${source.title} (fork)`,
            description:  source.description,
            language:     source.language,
            visibility:   "PUBLIC",
            contentType:  source.contentType,
            resourceKind: source.resourceKind,
            resourceUrl:  source.resourceUrl,
            forkDepth:    source.forkDepth + 1,
            ownerId:      session.user.id,
            parentTreeId: source.id,
          },
        });

        await tx.treeMembership.create({
          data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
        });

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

        if (source.contentType === "KERNEL") {
          // Copy module/resource attachments from source kernel
          for (const att of source.attachments) {
            await tx.treeAttachment.create({
              data: { kernelId: tree.id, contentId: att.contentId, addedById: session.user.id },
            });
          }
        }

        // Auto-attach into a valid kernel/module chosen above.
        if (targetKernelId && source.contentType !== "KERNEL") {
          await tx.treeAttachment.upsert({
            where:  { kernelId_contentId: { kernelId: targetKernelId, contentId: tree.id } },
            create: { kernelId: targetKernelId, contentId: tree.id, addedById: session.user.id },
            update: {},
          });
        }

        return tree;
      });

      // Notify original tree owner (outside transaction — failure is non-critical)
      if (source.ownerId !== session.user.id) {
        const forkOwnerUsername = session.user.username ?? session.user.name ?? session.user.id;
        try {
          await createNotification({
            type:        "NEW_FORK",
            recipientId: source.ownerId,
            actorId:     session.user.id,
            link:        `/${forkOwnerUsername}/${newTree.slug}`,
          });
        } catch (error) {
          console.error("Failed to create fork notification", error);
        }
      }

      return NextResponse.json({ slug: newTree.slug });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // slug collision — retry with a new suffix
    }
  }

  return NextResponse.json({ error: "No se pudo generar un slug único" }, { status: 500 });
}
