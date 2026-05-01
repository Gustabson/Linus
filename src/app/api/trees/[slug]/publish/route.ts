import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { slug } = await params;
  const { commitMessage = "" } = await req.json().catch(() => ({}));
  const msg = String(commitMessage).trim() || "Publicación";

  const tree = await prisma.documentTree.findUnique({
    where:   { slug },
    select:  { id: true, ownerId: true, contentType: true, title: true },
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

  // Generate a short unique public ID (8 hex chars)
  const fingerprint = createHash("sha256")
    .update(tree.id + session.user.id + Date.now().toString())
    .digest("hex");
  const publicId = fingerprint.slice(0, 8);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Mark all draft versions as published
    await tx.documentVersion.updateMany({
      where: { id: { in: draftVersions.map((v) => v.id) } },
      data:  { status: "PUBLISHED", commitMessage: msg },
    });

    // Update tree's last published timestamp
    await tx.documentTree.update({
      where: { id: tree.id },
      data:  { publishedAt: now },
    });

    // Create the publication record
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
}
