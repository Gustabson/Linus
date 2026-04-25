import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { createHash } from "crypto";

type Params = { params: Promise<{ slug: string; docSlug: string }> };

async function getOwnerDoc(slug: string, docSlug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!tree || tree.ownerId !== userId) return null;

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sections: { orderBy: { sectionOrder: "asc" } } },
      },
    },
  });
  return doc ? { tree, doc } : null;
}

function makeHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

// ── POST — add a new section ─────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  const existingSections = latestVersion?.sections ?? [];
  const newOrder = existingSections.length > 0
    ? Math.max(...existingSections.map((s) => s.sectionOrder)) + 1
    : 0;

  const emptyContent = { type: "doc", content: [] };
  const hash = makeHash(title + newOrder + Date.now());

  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: session.user.id,
        commitMessage: `Agregar sección: ${title}`,
        contentHash: hash,
        parentVersionId: latestVersion?.id ?? null,
        sections: {
          create: [
            ...existingSections.map((s) => ({
              sectionType: s.sectionType,
              sectionOrder: s.sectionOrder,
              difficultyLevel: s.difficultyLevel,
              ageRangeMin: s.ageRangeMin,
              ageRangeMax: s.ageRangeMax,
              gradeLevel: s.gradeLevel,
              durationMinutes: s.durationMinutes,
              isComplete: s.isComplete,
              richTextContent: s.richTextContent as object,
            })),
            {
              sectionType: title.trim(),
              sectionOrder: newOrder,
              difficultyLevel: "BEGINNER" as never,
              isComplete: false,
              richTextContent: emptyContent,
            },
          ],
        },
      },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: version.id } });
    return version;
  });

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: newVersion.id,
    subjectType: "version",
    eventPayload: { documentId: doc.id, action: "section_added", sectionTitle: title },
    actorId: session.user.id,
  });

  // Return the newly created section
  const newSection = newVersion.sections.find((s) => s.sectionOrder === newOrder);
  return NextResponse.json(newSection);
}

// ── PATCH — update a section's content/meta ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const body = await req.json();
  const { sectionId, richTextContent, difficultyLevel, ageRangeMin, ageRangeMax, durationMinutes } = body;

  const existingSections = latestVersion.sections;
  const targetSection = existingSections.find((s) => s.id === sectionId);
  if (!targetSection) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });

  const hash = makeHash(JSON.stringify(richTextContent));

  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: session.user.id,
        commitMessage: `Actualizar: ${targetSection.sectionType}`,
        contentHash: hash,
        parentVersionId: latestVersion.id,
        sections: {
          create: existingSections.map((s) =>
            s.id === sectionId
              ? {
                  sectionType: s.sectionType,
                  sectionOrder: s.sectionOrder,
                  difficultyLevel: (difficultyLevel ?? s.difficultyLevel) as never,
                  ageRangeMin: ageRangeMin ?? s.ageRangeMin,
                  ageRangeMax: ageRangeMax ?? s.ageRangeMax,
                  gradeLevel: s.gradeLevel,
                  durationMinutes: durationMinutes ?? s.durationMinutes,
                  isComplete: true,
                  richTextContent,
                }
              : {
                  sectionType: s.sectionType,
                  sectionOrder: s.sectionOrder,
                  difficultyLevel: s.difficultyLevel,
                  ageRangeMin: s.ageRangeMin,
                  ageRangeMax: s.ageRangeMax,
                  gradeLevel: s.gradeLevel,
                  durationMinutes: s.durationMinutes,
                  isComplete: s.isComplete,
                  richTextContent: s.richTextContent as object,
                }
          ),
        },
      },
    });
    await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: version.id } });
    return version;
  });

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: newVersion.id,
    subjectType: "version",
    eventPayload: { documentId: doc.id, sectionId, sectionTitle: targetSection.sectionType, hash },
    actorId: session.user.id,
  });

  return NextResponse.json({ versionId: newVersion.id });
}

// ── DELETE — remove a section ────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const { sectionId } = await req.json();
  const remaining = latestVersion.sections.filter((s) => s.id !== sectionId);

  const hash = makeHash(remaining.map((s) => s.id).join(",") + Date.now());

  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: session.user.id,
        commitMessage: "Eliminar sección",
        contentHash: hash,
        parentVersionId: latestVersion.id,
        sections: {
          create: remaining.map((s) => ({
            sectionType: s.sectionType,
            sectionOrder: s.sectionOrder,
            difficultyLevel: s.difficultyLevel,
            ageRangeMin: s.ageRangeMin,
            ageRangeMax: s.ageRangeMax,
            gradeLevel: s.gradeLevel,
            durationMinutes: s.durationMinutes,
            isComplete: s.isComplete,
            richTextContent: s.richTextContent as object,
          })),
        },
      },
    });
    await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: version.id } });
    return version;
  });

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: newVersion.id,
    subjectType: "version",
    eventPayload: { documentId: doc.id, action: "section_deleted", sectionId },
    actorId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
