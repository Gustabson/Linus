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

  const { treeId } = await req.json();
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
    },
  });

  if (!source || source.visibility === "PRIVATE") {
    return NextResponse.json({ error: "Currículo no encontrado" }, { status: 404 });
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
        isKernel: false,
        forkDepth: source.forkDepth + 1,
        ownerId: session.user.id,
        parentTreeId: source.id,
      },
    });

    await tx.treeMembership.create({
      data: { treeId: tree.id, userId: session.user.id, role: "OWNER" },
    });

    // Clone all documents and their latest versions
    for (const doc of source.documents) {
      const latestVersion = doc.versions[0];
      if (!latestVersion) continue;

      const newDoc = await tx.document.create({
        data: {
          treeId: tree.id,
          slug: doc.slug,
          title: doc.title,
        },
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
    },
    actorId: session.user.id,
  });

  return NextResponse.json({ slug: newTree.slug });
}
