import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { treeId, targetKernelId } = await req.json();
  if (!treeId) {
    return NextResponse.json({ error: "treeId requerido" }, { status: 400 });
  }

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

  if (!source || source.visibility === "PRIVATE") {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  if (targetKernelId) {
    const targetKernel = await prisma.documentTree.findUnique({
      where: { id: targetKernelId },
      select: { ownerId: true, contentType: true },
    });
    if (!targetKernel || targetKernel.ownerId !== session.user.id || targetKernel.contentType !== "KERNEL") {
      return NextResponse.json({ error: "Kernel destino inválido" }, { status: 400 });
    }
  }

  const baseSlug = slugify(`${source.title} fork ${session.user.name ?? "user"}`);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.documentTree.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const newTree = await prisma.$transaction(async (tx) => {
    const tree = await tx.documentTree.create({
      data: {
        slug,
        title: `${source.title} (fork)`,
        description: source.description,
        language: source.language,
        visibility: "PUBLIC",
        contentType: source.contentType,
        forkDepth: source.forkDepth + 1,
        ownerId: session.user.id,
        parentTreeId: source.id,
      },
    });

    await tx.treeMembership.create({
      data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
    });

    if (source.contentType === "KERNEL") {
      for (const doc of source.documents) {
        const latestVersion = doc.versions[0];
        if (!latestVersion) continue;

        const newDoc = await tx.document.create({
          data: { treeId: tree.id, slug: doc.slug, title: doc.title },
        });

        const newVersion = await tx.documentVersion.create({
          data: {
            documentId: newDoc.id,
            authorId: session.user.id,
            commitMessage: `Fork desde "${source.title}"`,
            contentHash: latestVersion.contentHash,
            parentVersionId: latestVersion.id,
            sections: {
              create: latestVersion.sections.map((s) => ({
                sectionType: s.sectionType,
                sectionOrder: s.sectionOrder,
                difficultyLevel: s.difficultyLevel,
                ageRangeMin: s.ageRangeMin,
                ageRangeMax: s.ageRangeMax,
                gradeLevel: s.gradeLevel,
                durationMinutes: s.durationMinutes,
                isComplete: s.isComplete,
                richTextContent: s.richTextContent ?? {},
              })),
            },
          },
        });

        await tx.document.update({
          where: { id: newDoc.id },
          data: { currentVersionId: newVersion.id },
        });
      }

      // Copy module/resource attachments from source kernel
      for (const att of source.attachments) {
        await tx.treeAttachment.create({
          data: { kernelId: tree.id, contentId: att.contentId, addedById: session.user.id },
        });
      }
    }

    // If forking a MODULE/RESOURCE and user picked a target kernel
    if (targetKernelId && source.contentType !== "KERNEL") {
      await tx.treeAttachment.upsert({
        where: { kernelId_contentId: { kernelId: targetKernelId, contentId: tree.id } },
        create: { kernelId: targetKernelId, contentId: tree.id, addedById: session.user.id },
        update: {},
      });
    }

    return tree;
  });

  await writeLedgerEntry({
    eventType: "TREE_FORKED",
    subjectId: newTree.id,
    subjectType: "tree",
    eventPayload: {
      sourceTreeId: source.id,
      sourceTreeTitle: source.title,
      newTreeId: newTree.id,
      forkDepth: newTree.forkDepth,
      contentType: source.contentType,
      targetKernelId: targetKernelId ?? null,
    },
    actorId: session.user.id,
  });

  return NextResponse.json({ slug: newTree.slug });
}
