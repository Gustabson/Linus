import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { createHash } from "crypto";
import type { SectionType, DifficultyLevel } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; docSlug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { slug, docSlug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  if (!tree || tree.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sections: true },
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { sectionType, richTextContent, difficultyLevel, ageRangeMin, ageRangeMax, durationMinutes } = body;

  const latestVersion = doc.versions[0];

  // Create a new version with the updated section
  const contentString = JSON.stringify(richTextContent);
  const contentHash = createHash("sha256").update(contentString).digest("hex");

  const existingSections = latestVersion?.sections ?? [];

  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: session.user.id,
        commitMessage: `Actualizar sección: ${sectionType}`,
        contentHash,
        parentVersionId: latestVersion?.id ?? null,
        sections: {
          create: existingSections
            .filter((s) => s.sectionType !== sectionType)
            .map((s) => ({
              sectionType: s.sectionType,
              sectionOrder: s.sectionOrder,
              difficultyLevel: s.difficultyLevel,
              ageRangeMin: s.ageRangeMin,
              ageRangeMax: s.ageRangeMax,
              gradeLevel: s.gradeLevel,
              durationMinutes: s.durationMinutes,
              isComplete: s.isComplete,
              richTextContent: s.richTextContent as object,
            }))
            .concat([
              {
                sectionType: sectionType as SectionType,
                sectionOrder: ["PHILOSOPHY","BEHAVIOR","EXERCISES","PROBLEMS","ANTI_BULLYING","ECONOMY","SCIENTIFIC_METHOD","ETHICS","ASSESSMENT","RESOURCES"].indexOf(sectionType),
                difficultyLevel: (difficultyLevel ?? "BEGINNER") as DifficultyLevel,
                ageRangeMin: ageRangeMin ?? null,
                ageRangeMax: ageRangeMax ?? null,
                gradeLevel: null,
                durationMinutes: durationMinutes ?? null,
                isComplete: true,
                richTextContent,
              },
            ]),
        },
      },
    });

    await tx.document.update({
      where: { id: doc.id },
      data: { currentVersionId: version.id },
    });

    return version;
  });

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: newVersion.id,
    subjectType: "version",
    eventPayload: {
      documentId: doc.id,
      treeId: tree.id,
      sectionType,
      contentHash,
      parentVersionId: latestVersion?.id ?? null,
    },
    actorId: session.user.id,
  });

  return NextResponse.json({ versionId: newVersion.id });
}
