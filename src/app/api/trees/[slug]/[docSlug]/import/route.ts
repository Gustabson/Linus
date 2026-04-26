import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitTextIntoSections, pdfEmbedContent } from "@/lib/importUtils";
import type { VersionStatus } from "@prisma/client";
import { copySectionFields } from "@/lib/sections";

type Params = { params: Promise<{ slug: string; docSlug: string }> };

// ── helpers ───────────────────────────────────────────────────────────────────

/** Ensure there is a DRAFT version to add sections to. Returns the draft. */
async function ensureDraft(docId: string, authorId: string) {
  const latest = await prisma.documentVersion.findFirst({
    where:   { documentId: docId },
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { sectionOrder: "asc" } } },
  });

  if (!latest) {
    // No version at all — create a fresh DRAFT
    const draft = await prisma.documentVersion.create({
      data: { documentId: docId, authorId, status: "DRAFT" as VersionStatus },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await prisma.document.update({ where: { id: docId }, data: { currentVersionId: draft.id } });
    return draft;
  }

  if (latest.status === "DRAFT") return latest;

  // Latest is PUBLISHED — fork to a new DRAFT
  const draft = await prisma.$transaction(async (tx) => {
    const newDraft = await tx.documentVersion.create({
      data: {
        documentId:      docId,
        authorId,
        status:          "DRAFT" as VersionStatus,
        parentVersionId: latest.id,
        sections: {
          create: latest.sections.map((s) => copySectionFields(s)),
        },
      },
      include: { sections: { orderBy: { sectionOrder: "asc" } } },
    });
    await tx.document.update({ where: { id: docId }, data: { currentVersionId: newDraft.id } });
    return newDraft;
  });
  return draft;
}

/** Append new sections to an existing draft version. */
async function appendSections(
  versionId: string,
  startOrder: number,
  newSections: { title: string; richTextContent: object }[]
) {
  return prisma.$transaction(
    newSections.map((s, i) =>
      prisma.documentSection.create({
        data: {
          versionId,
          sectionType:    s.title,
          sectionOrder:   startOrder + i,
          richTextContent: s.richTextContent as never,
          isComplete:      true,
        },
      })
    )
  );
}

// ── route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/trees/[slug]/[docSlug]/import
 *
 * Accepts multipart/form-data with a `file` field (.pdf or .docx).
 * Optional `sectionTitle` field for when a non-extractable PDF needs a title.
 * Optional `blobUrl` field to finalize a pending PDF embed.
 *
 * Returns:
 *   { ok: true, count: N }               – N sections created
 *   { needsTitle: true, blobUrl: string } – PDF couldn't be extracted; client must re-POST with title+blobUrl
 *   { error: string }                     – something went wrong
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug, docSlug } = await params;

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, ownerId: true },
  });
  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true },
  });
  if (!doc)
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const formData = await req.formData();

  // ── Case A: finalise a pending PDF embed (client sends title + blobUrl) ──
  const pendingBlobUrl  = formData.get("blobUrl") as string | null;
  const pendingTitle    = formData.get("sectionTitle") as string | null;

  if (pendingBlobUrl && pendingTitle) {
    const draft      = await ensureDraft(doc.id, session.user.id);
    const startOrder = draft.sections.length;
    await appendSections(draft.id, startOrder, [
      { title: pendingTitle, richTextContent: pdfEmbedContent(pendingBlobUrl) },
    ]);
    return NextResponse.json({ ok: true, count: 1 });
  }

  // ── Case B: new file upload ───────────────────────────────────────────────
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const filename = file.name.toLowerCase();
  const buffer   = Buffer.from(await file.arrayBuffer());

  let sections: { title: string; richTextContent: object }[] = [];

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (filename.endsWith(".pdf")) {
    let text = "";
    try {
      // pdf-parse is CJS; import dynamically to avoid ESM issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParseMod = await import("pdf-parse") as any;
      const pdfParse    = pdfParseMod.default ?? pdfParseMod;
      const data        = await pdfParse(buffer);
      text           = data.text ?? "";
    } catch {
      // parse error — treat as non-extractable
    }

    if (!text.trim()) {
      // Non-extractable PDF: upload to Vercel Blob for embedding
      try {
        const { put } = await import("@vercel/blob");
        const blob    = await put(`imports/${Date.now()}-${file.name}`, buffer, {
          access:      "public",
          contentType: "application/pdf",
        });
        return NextResponse.json({ needsTitle: true, blobUrl: blob.url });
      } catch {
        return NextResponse.json(
          { error: "El PDF no tiene texto extraíble y no se pudo subir para mostrar. Intentá con un PDF con texto seleccionable." },
          { status: 422 }
        );
      }
    }

    sections = splitTextIntoSections(text, file.name.replace(/\.pdf$/i, ""));

  // ── DOCX ─────────────────────────────────────────────────────────────────
  } else if (filename.endsWith(".docx")) {
    try {
      const mammoth  = await import("mammoth");
      const result   = await mammoth.extractRawText({ buffer });
      const text     = result.value ?? "";
      if (!text.trim()) {
        return NextResponse.json({ error: "El archivo Word parece estar vacío." }, { status: 422 });
      }
      sections = splitTextIntoSections(text, file.name.replace(/\.docx$/i, ""));
    } catch {
      return NextResponse.json({ error: "No se pudo leer el archivo Word." }, { status: 422 });
    }

  } else {
    return NextResponse.json(
      { error: "Formato no soportado. Usá PDF o Word (.docx)." },
      { status: 400 }
    );
  }

  if (sections.length === 0) {
    return NextResponse.json({ error: "No se encontró contenido en el archivo." }, { status: 422 });
  }

  // Cap at 20 sections to avoid creating hundreds of tiny ones
  sections = sections.slice(0, 20);

  const draft      = await ensureDraft(doc.id, session.user.id);
  const startOrder = draft.sections.length;
  await appendSections(draft.id, startOrder, sections);

  return NextResponse.json({ ok: true, count: sections.length });
}
