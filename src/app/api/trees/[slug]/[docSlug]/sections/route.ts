import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { copySectionFields } from "@/lib/sections";
import type { DocumentSection, VersionStatus } from "@prisma/client";

type Params = { params: Promise<{ slug: string; docSlug: string }> };

// ── Shared helpers ────────────────────────────────────────────────────────────

async function getOwnerDoc(slug: string, docSlug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
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

/**
 * Forks a PUBLISHED version into a new DRAFT, optionally overriding specific
 * section fields (used when the first edit happens after a publish).
 *
 * Returns the new draft and a map of old section IDs → new draft section IDs,
 * so the client can update its local state without a full page reload.
 */
async function forkToDraft(
  docId:     string,
  authorId:  string,
  published: { id: string; sections: DocumentSection[] },
  overrides: Record<string, Partial<ReturnType<typeof copySectionFields>>> = {},
) {
  const draft = await prisma.$transaction(async (tx) => {
    const newDraft = await tx.documentVersion.create({
      data: {
        documentId:      docId,
        authorId,
        status:          "DRAFT" as VersionStatus,
        parentVersionId: published.id,
        sections: {
          create: published.sections.map((s) => ({
            ...copySectionFields(s),
            ...(overrides[s.id] ?? {}),
          })),
        },
      },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await tx.document.update({ where: { id: docId }, data: { currentVersionId: newDraft.id } });
    return newDraft;
  });

  // Map old section IDs to new draft section IDs by matching sectionOrder
  const sectionIdMap: Record<string, string> = {};
  for (const old of published.sections) {
    const fresh = draft.sections.find((s) => s.sectionOrder === old.sectionOrder);
    if (fresh) sectionIdMap[old.id] = fresh.id;
  }

  return { draft, sectionIdMap };
}

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
  const latestVersion = doc.versions[0];
  const existing      = latestVersion?.sections ?? [];
  const newOrder      = existing.length > 0 ? Math.max(...existing.map((s) => s.sectionOrder)) + 1 : 0;

  const newSectionData = {
    sectionType:     title.trim(),
    sectionOrder:    newOrder,
    difficultyLevel: "BEGINNER" as const,
    isComplete:      false,
    richTextContent: { type: "doc", content: [] },
  };

  // ── Case 1: DRAFT already exists → add section directly ──────────────────
  if (latestVersion?.status === "DRAFT") {
    const newSection = await prisma.documentSection.create({
      data: { versionId: latestVersion.id, ...newSectionData },
    });
    return NextResponse.json({ ...newSection, draftCreated: false, sectionIdMap: {} });
  }

  // ── Case 2: Current version is PUBLISHED → fork first, then add section ──
  const base = latestVersion ?? { id: null as unknown as string, sections: [] };
  const { draft, sectionIdMap } = await forkToDraft(doc.id, session.user.id, base);

  const newSection = await prisma.documentSection.create({
    data: { versionId: draft.id, ...newSectionData },
  });

  return NextResponse.json({ ...newSection, draftCreated: true, sectionIdMap });
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

  const { sectionId, richTextContent, sectionTitle, difficultyLevel, ageRangeMin, ageRangeMax, durationMinutes } =
    await req.json();

  const target = latestVersion.sections.find((s) => s.id === sectionId);
  if (!target) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });

  const sectionUpdates = {
    sectionType:     sectionTitle    ?? undefined,
    difficultyLevel: (difficultyLevel ?? undefined) as never,
    ageRangeMin:     ageRangeMin     ?? undefined,
    ageRangeMax:     ageRangeMax     ?? undefined,
    durationMinutes: durationMinutes ?? undefined,
    isComplete:      richTextContent != null ? true : undefined,
    richTextContent: richTextContent ?? undefined,
  };

  // ── Case 1: DRAFT → update section record in-place ────────────────────────
  if (latestVersion.status === "DRAFT") {
    const updated = await prisma.documentSection.update({
      where: { id: sectionId },
      data:  sectionUpdates,
    });
    return NextResponse.json({
      sectionId:    updated.id,
      isComplete:   updated.isComplete,
      draftCreated: false,
      sectionIdMap: {},
    });
  }

  // ── Case 2: PUBLISHED → fork to DRAFT with target section overridden ──────
  const overrides: Record<string, Partial<ReturnType<typeof copySectionFields>>> = {
    [sectionId]: {
      sectionType:     sectionTitle    ?? target.sectionType,
      richTextContent: richTextContent ?? (target.richTextContent as object),
      isComplete:      richTextContent != null ? true : target.isComplete,
      difficultyLevel: (difficultyLevel ?? target.difficultyLevel) as never,
      ageRangeMin:     ageRangeMin     ?? target.ageRangeMin   ?? undefined,
      ageRangeMax:     ageRangeMax     ?? target.ageRangeMax   ?? undefined,
      durationMinutes: durationMinutes ?? target.durationMinutes ?? undefined,
    },
  };

  const { sectionIdMap } = await forkToDraft(doc.id, session.user.id, latestVersion, overrides);

  return NextResponse.json({
    sectionId:    sectionIdMap[sectionId] ?? sectionId,
    isComplete:   richTextContent != null ? true : target.isComplete,
    draftCreated: true,
    sectionIdMap,
  });
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

  // ── Case 1: DRAFT → delete section directly ───────────────────────────────
  if (latestVersion.status === "DRAFT") {
    await prisma.documentSection.delete({ where: { id: sectionId } });
    return NextResponse.json({ ok: true, draftCreated: false, sectionIdMap: {} });
  }

  // ── Case 2: PUBLISHED → fork without the deleted section ─────────────────
  const remaining = { ...latestVersion, sections: latestVersion.sections.filter((s) => s.id !== sectionId) };
  const { sectionIdMap } = await forkToDraft(doc.id, session.user.id, remaining);

  return NextResponse.json({ ok: true, draftCreated: true, sectionIdMap });
}
