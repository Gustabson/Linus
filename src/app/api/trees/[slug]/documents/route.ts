import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getOwnedTree, unauthorized, forbidden, uniqueSlug, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";

const DOCUMENT_TITLE_MAX = 200;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const tree = await getOwnedTree(slug, session.user.id);
  if (!tree) return forbidden();

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const title = safeString(body.title, DOCUMENT_TITLE_MAX);
  if (!title) return NextResponse.json({ error: `Título requerido (máximo ${DOCUMENT_TITLE_MAX} caracteres)` }, { status: 400 });

  const docSlug = await uniqueSlug(title, (s) =>
    prisma.document
      .findUnique({ where: { treeId_slug: { treeId: tree.id, slug: s } }, select: { id: true } })
      .then(Boolean)
  );

  const doc = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.document.create({
      data: { treeId: tree.id, slug: docSlug, title },
    });
    const version = await tx.documentVersion.create({
      data: {
        documentId:    newDoc.id,
        authorId:      session.user.id,
        status:        "DRAFT",
        commitMessage: "Documento creado",
      },
    });
    await tx.document.update({
      where: { id: newDoc.id },
      data:  { currentVersionId: version.id },
    });
    return newDoc;
  });

  return NextResponse.json({ slug: docSlug, id: doc.id });
}
