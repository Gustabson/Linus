import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { copySectionFields, forkPublishedVersionToDraft, sanitizeRichTextDocument, SECTION_TITLE_MAX } from "@/lib/sections";
import { getSession, unauthorized, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";
import type { VersionStatus } from "@prisma/client";

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

// ── GET — fetch current sections (used by DocExportButton for fresh data) ─────
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, docSlug } = await params;
  const session = await getSession();

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, visibility: true, ownerId: true },
  });
  if (!tree) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session?.user.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        where: isOwner ? undefined : { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take:    1,
        include: { sections: { orderBy: { sectionOrder: "asc" } } },
      },
    },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwner && !doc.versions[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { sections: doc.versions[0]?.sections ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

// ── POST — add a new section ──────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const title = safeString(body.title, SECTION_TITLE_MAX);
  if (!title) return NextResponse.json({ error: `Título requerido (máximo ${SECTION_TITLE_MAX} caracteres)` }, { status: 400 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  const existing      = latestVersion?.sections ?? [];
  const newOrder      = existing.length > 0 ? Math.max(...existing.map((s) => s.sectionOrder)) + 1 : 0;

  const newSectionData = {
    sectionType:     title,
    sectionOrder:    newOrder,
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

  // ── Case 2: No version yet → create a fresh DRAFT then add section ───────
  if (!latestVersion) {
    const freshDraft = await prisma.$transaction(async (tx) => {
      const d = await tx.documentVersion.create({
        data: { documentId: doc.id, authorId: session.user.id, status: "DRAFT" as VersionStatus },
      });
      await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: d.id } });
      return d;
    });
    const newSection = await prisma.documentSection.create({
      data: { versionId: freshDraft.id, ...newSectionData },
    });
    return NextResponse.json({ ...newSection, draftCreated: true, sectionIdMap: {} });
  }

  // ── Case 3: Current version is PUBLISHED → fork first, then add section ──
  const { draft, sectionIdMap } = await forkPublishedVersionToDraft(doc.id, session.user.id, latestVersion);

  const newSection = await prisma.documentSection.create({
    data: { versionId: draft.id, ...newSectionData },
  });

  return NextResponse.json({ ...newSection, draftCreated: true, sectionIdMap });
}

// ── PATCH — update a section's content / meta ─────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const patchBody = await parseBody(req);
  if (!patchBody) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const sectionId = safeString(patchBody.sectionId, 100);
  if (!sectionId) return NextResponse.json({ error: "sectionId inválido" }, { status: 400 });
  const hasContent = Object.prototype.hasOwnProperty.call(patchBody, "richTextContent");
  const richTextContent = hasContent ? sanitizeRichTextDocument(patchBody.richTextContent) : undefined;
  if (hasContent && !richTextContent)
    return NextResponse.json({ error: "Contenido enriquecido inválido o demasiado grande" }, { status: 400 });
  const hasTitle = Object.prototype.hasOwnProperty.call(patchBody, "sectionTitle");
  const sectionTitle = hasTitle ? safeString(patchBody.sectionTitle, SECTION_TITLE_MAX) : undefined;
  if (hasTitle && !sectionTitle)
    return NextResponse.json({ error: `Título inválido (máximo ${SECTION_TITLE_MAX} caracteres)` }, { status: 400 });
  const validatedTitle = sectionTitle ?? undefined;

  const target = latestVersion.sections.find((s) => s.id === sectionId);
  if (!target) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });

  const sectionUpdates = {
    sectionType:     validatedTitle,
    isComplete:      richTextContent ? true : undefined,
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
      sectionType:     validatedTitle  ?? target.sectionType,
      richTextContent: richTextContent ?? (target.richTextContent as object),
      isComplete:      richTextContent ? true : target.isComplete,
    },
  };

  const { sectionIdMap } = await forkPublishedVersionToDraft(doc.id, session.user.id, latestVersion, overrides);

  return NextResponse.json({
    sectionId:    sectionIdMap[sectionId] ?? sectionId,
    isComplete:   richTextContent ? true : target.isComplete,
    draftCreated: true,
    sectionIdMap,
  });
}

// ── DELETE — remove a section ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug, docSlug } = await params;
  const result = await getOwnerDoc(slug, docSlug, session.user.id);
  if (!result) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { doc } = result;
  const latestVersion = doc.versions[0];
  if (!latestVersion) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const delBody = await parseBody(req);
  if (!delBody) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const sectionId = safeString(delBody.sectionId, 100);
  if (!sectionId) return NextResponse.json({ error: "sectionId inválido" }, { status: 400 });

  const target = latestVersion.sections.find((s) => s.id === sectionId);
  if (!target) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });

  // ── Case 1: DRAFT → delete section directly ───────────────────────────────
  if (latestVersion.status === "DRAFT") {
    await prisma.documentSection.delete({ where: { id: sectionId } });
    return NextResponse.json({ ok: true, draftCreated: false, sectionIdMap: {} });
  }

  // ── Case 2: PUBLISHED → fork without the deleted section ─────────────────
  const remaining = { ...latestVersion, sections: latestVersion.sections.filter((s) => s.id !== sectionId) };
  const { sectionIdMap } = await forkPublishedVersionToDraft(doc.id, session.user.id, remaining);

  return NextResponse.json({ ok: true, draftCreated: true, sectionIdMap });
}
