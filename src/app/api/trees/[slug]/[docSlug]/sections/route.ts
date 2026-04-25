import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { copySectionFields } from "@/lib/sections";
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

/** Commits a new version and updates the document's currentVersionId. */
async function commitVersion(
  docId: string,
  authorId: string,
  commitMessage: string,
  contentHash: string,
  parentVersionId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: any[]
) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: docId,
        authorId,
        commitMessage,
        contentHash,
        parentVersionId,
        sections: { create: sections },
      },
    });
    await tx.document.update({ where: { id: docId }, data: { currentVersionId: version.id } });
    return version;
  });
}

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");

// ── POST — add a new section ──────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const { doc } = result;
  const existing = doc.versions[0]?.sections ?? [];
  const newOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.sectionOrder)) + 1 : 0;

  // POST needs the new section back, so we run the transaction inline with include
  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: session.user.id,
        commitMessage: `Agregar sección: ${title}`,
        contentHash: sha256(title + newOrder + Date.now()),
        parentVersionId: doc.versions[0]?.id ?? null,
        sections: {
          create: [
            ...existing.map(copySectionFields),
            {
              sectionType: title.trim(),
              sectionOrder: newOrder,
              difficultyLevel: "BEGINNER" as never,
              isComplete: false,
              richTextContent: { type: "doc", content: [] },
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

  const created = newVersion.sections.find((s) => s.sectionOrder === newOrder);
  return NextResponse.json(created);
}

// ── PATCH — update a section's content / meta ─────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const { sectionId, richTextContent, difficultyLevel, ageRangeMin, ageRangeMax, durationMinutes } =
    await req.json();

  const target = latestVersion.sections.find((s) => s.id === sectionId);
  if (!target) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });

  const updatedSections = latestVersion.sections.map((s) =>
    s.id === sectionId
      ? {
          ...copySectionFields(s),
          difficultyLevel: (difficultyLevel ?? s.difficultyLevel) as never,
          ageRangeMin:     ageRangeMin     ?? s.ageRangeMin,
          ageRangeMax:     ageRangeMax     ?? s.ageRangeMax,
          durationMinutes: durationMinutes ?? s.durationMinutes,
          isComplete: true,
          richTextContent,
        }
      : copySectionFields(s)
  );

  const version = await commitVersion(
    doc.id, session.user.id,
    `Actualizar: ${target.sectionType}`,
    sha256(JSON.stringify(richTextContent)),
    latestVersion.id,
    updatedSections
  );

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: version.id,
    subjectType: "version",
    eventPayload: { documentId: doc.id, sectionId, sectionTitle: target.sectionType, hash: version.contentHash },
    actorId: session.user.id,
  });

  return NextResponse.json({ versionId: version.id });
}

// ── DELETE — remove a section ─────────────────────────────────────────────────
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

  const version = await commitVersion(
    doc.id, session.user.id,
    "Eliminar sección",
    sha256(remaining.map((s) => s.id).join(",") + Date.now()),
    latestVersion.id,
    remaining.map(copySectionFields)
  );

  await writeLedgerEntry({
    eventType: "VERSION_COMMITTED",
    subjectId: version.id,
    subjectType: "version",
    eventPayload: { documentId: doc.id, action: "section_deleted", sectionId },
    actorId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
