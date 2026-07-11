import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, isUniqueViolation, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ slug: string }> };
const COMMIT_MESSAGE_MAX = 500;

class NoDraftsError extends Error {}
class PublishConflictError extends Error {}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const body = await parseBody(req, 4_096);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const rawMessage = body.commitMessage;
  if (rawMessage != null && typeof rawMessage !== "string")
    return NextResponse.json({ error: "Descripción inválida" }, { status: 400 });
  const trimmedMessage = rawMessage?.trim() ?? "";
  if (trimmedMessage.length > COMMIT_MESSAGE_MAX)
    return NextResponse.json({ error: `La descripción supera ${COMMIT_MESSAGE_MAX} caracteres` }, { status: 400 });
  const msg = trimmedMessage || "Publicación";

  const tree = await prisma.documentTree.findUnique({
    where:   { slug },
    select:  { id: true, ownerId: true },
  });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  // Try up to 5 times to handle (extremely rare) publicId collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const publicId = randomBytes(6).toString("hex"); // 12 hex chars
    const now = new Date();
    try {
      await prisma.$transaction(async (tx) => {
        const documents = await tx.document.findMany({
          where: { treeId: tree.id },
          select: { currentVersionId: true },
        });
        const currentVersionIds = documents.flatMap((document) => document.currentVersionId ? [document.currentVersionId] : []);
        const draftVersions = await tx.documentVersion.findMany({
          where: { id: { in: currentVersionIds }, status: "DRAFT" },
          select: { id: true },
        });
        if (draftVersions.length === 0) throw new NoDraftsError();

        const updated = await tx.documentVersion.updateMany({
          where: { id: { in: draftVersions.map((version) => version.id) }, status: "DRAFT" },
          data:  { status: "PUBLISHED", commitMessage: msg },
        });
        if (updated.count !== draftVersions.length) throw new PublishConflictError();
        await tx.documentTree.update({
          where: { id: tree.id },
          data:  { publishedAt: now },
        });
        await tx.treePublication.create({
          data: {
            publicId,
            commitMessage: msg,
            publishedAt:   now,
            treeId:        tree.id,
            authorId:      session.user.id,
          },
        });
      });
      return NextResponse.json({ publicId, publishedAt: now.toISOString() });
    } catch (err) {
      if (err instanceof NoDraftsError)
        return NextResponse.json({ error: "No hay cambios para publicar" }, { status: 400 });
      if (err instanceof PublishConflictError)
        return NextResponse.json({ error: "El documento cambió durante la publicación. Intentá nuevamente." }, { status: 409 });
      if (!isUniqueViolation(err)) throw err;
      // publicId collision — retry with a new random
    }
  }

  return NextResponse.json({ error: "No se pudo generar un ID único" }, { status: 500 });
}
