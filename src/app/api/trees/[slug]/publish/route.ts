import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, isUniqueViolation } from "@/lib/api-helpers";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const { commitMessage = "" } = await req.json().catch(() => ({}));
  const msg = String(commitMessage).trim() || "Publicación";

  const tree = await prisma.documentTree.findUnique({
    where:   { slug },
    select:  { id: true, ownerId: true },
  });

  if (!tree || tree.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  // Find all current draft versions across documents
  const draftVersions = await prisma.documentVersion.findMany({
    where: {
      document: { treeId: tree.id },
      status:   "DRAFT",
    },
    include: {
      sections: { orderBy: { sectionOrder: "asc" } },
    },
  });

  if (draftVersions.length === 0)
    return NextResponse.json({ error: "No hay cambios para publicar" }, { status: 400 });

  const now = new Date();

  // Try up to 5 times to handle (extremely rare) publicId collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const publicId = randomBytes(6).toString("hex"); // 12 hex chars
    try {
      await prisma.$transaction(async (tx) => {
        await tx.documentVersion.updateMany({
          where: { id: { in: draftVersions.map((v) => v.id) } },
          data:  { status: "PUBLISHED", commitMessage: msg },
        });
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
      if (!isUniqueViolation(err)) throw err;
      // publicId collision — retry with a new random
    }
  }

  return NextResponse.json({ error: "No se pudo generar un ID único" }, { status: 500 });
}
