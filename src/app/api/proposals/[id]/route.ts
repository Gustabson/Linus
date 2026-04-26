import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeLedgerEntry } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";
import { copySectionFields } from "@/lib/sections";
import { createHash } from "crypto";

type Params = { params: Promise<{ id: string }> };
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// GET /api/proposals/[id] — full detail with docs from both trees
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.changeProposal.findUnique({
    where:   { id },
    include: {
      sourceTree: {
        select: { slug: true, title: true, ownerId: true },
      },
      targetTree: {
        select: { slug: true, title: true, ownerId: true },
      },
      author:   { select: { name: true, username: true, image: true } },
      reviewer: { select: { name: true, username: true } },
    },
  });

  if (!proposal) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const userId = session.user.id;
  const isAuthor   = proposal.authorId === userId;
  const isReviewer = proposal.targetTree.ownerId === userId;
  if (!isAuthor && !isReviewer)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  // Fetch documents from both trees (latest version + sections)
  const docSelect = {
    select: {
      id: true, slug: true, title: true,
      versions: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        include: { sections: { orderBy: { sectionOrder: "asc" as const } } },
      },
    },
  };

  const [sourceDocs, targetDocs] = await Promise.all([
    prisma.document.findMany({ where: { treeId: proposal.sourceTreeId }, ...docSelect }),
    prisma.document.findMany({ where: { treeId: proposal.targetTreeId }, ...docSelect }),
  ]);

  return NextResponse.json({ proposal, sourceDocs, targetDocs });
}

// PATCH /api/proposals/[id] — accept | reject | withdraw
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json(); // "accept" | "reject" | "withdraw"

  const proposal = await prisma.changeProposal.findUnique({
    where:   { id },
    include: {
      targetTree: { select: { ownerId: true, slug: true } },
      sourceTree: { select: { ownerId: true, slug: true } },
    },
  });
  if (!proposal) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (proposal.status !== "OPEN")
    return NextResponse.json({ error: "La propuesta ya fue resuelta" }, { status: 409 });

  const userId      = session.user.id;
  const isAuthor    = proposal.authorId === userId;
  const isTargetOwner = proposal.targetTree.ownerId === userId;

  if (action === "withdraw") {
    if (!isAuthor) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    await prisma.changeProposal.update({
      where: { id },
      data:  { status: "WITHDRAWN", reviewedAt: new Date(), reviewerId: userId },
    });
    await writeLedgerEntry({
      eventType: "PROPOSAL_WITHDRAWN", subjectId: id, subjectType: "proposal",
      eventPayload: { proposalId: id }, actorId: userId,
    });
    return NextResponse.json({ ok: true, status: "WITHDRAWN" });
  }

  if (action === "reject") {
    if (!isTargetOwner) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    await prisma.changeProposal.update({
      where: { id },
      data:  { status: "REJECTED", reviewedAt: new Date(), reviewerId: userId },
    });
    await writeLedgerEntry({
      eventType: "PROPOSAL_REVIEWED", subjectId: id, subjectType: "proposal",
      eventPayload: { proposalId: id, decision: "rejected" }, actorId: userId,
    });
    await createNotification({
      type: "PROPOSAL_REVIEWED", recipientId: proposal.authorId,
      actorId: userId, link: `/propuestas/${id}`,
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (action === "accept") {
    if (!isTargetOwner) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

    // Fetch source + target docs for merge
    const docSelect = {
      include: {
        versions: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          include: { sections: { orderBy: { sectionOrder: "asc" as const } } },
        },
      },
    };
    const [sourceDocs, targetDocs] = await Promise.all([
      prisma.document.findMany({ where: { treeId: proposal.sourceTreeId }, ...docSelect }),
      prisma.document.findMany({ where: { treeId: proposal.targetTreeId }, ...docSelect }),
    ]);

    // Merge: for each source doc, find matching target doc by slug and commit new version
    await prisma.$transaction(async (tx) => {
      for (const sourceDoc of sourceDocs) {
        const sourceVersion = sourceDoc.versions[0];
        if (!sourceVersion) continue;

        const targetDoc = targetDocs.find((d) => d.slug === sourceDoc.slug);
        if (!targetDoc) continue; // doc doesn't exist in target, skip

        const targetVersion = targetDoc.versions[0];
        const newVersion = await tx.documentVersion.create({
          data: {
            documentId:    targetDoc.id,
            authorId:      userId,
            commitMessage: `Merge de propuesta: ${proposal.title}`,
            contentHash:   sha256(JSON.stringify(sourceVersion.sections.map(copySectionFields))),
            parentVersionId: targetVersion?.id ?? null,
            sections: {
              create: sourceVersion.sections.map(copySectionFields),
            },
          },
        });
        await tx.document.update({
          where: { id: targetDoc.id },
          data:  { currentVersionId: newVersion.id },
        });
      }

      await tx.changeProposal.update({
        where: { id },
        data:  { status: "ACCEPTED", reviewedAt: new Date(), reviewerId: userId },
      });
    });

    await writeLedgerEntry({
      eventType: "PROPOSAL_MERGED", subjectId: id, subjectType: "proposal",
      eventPayload: { proposalId: id, targetTreeId: proposal.targetTreeId }, actorId: userId,
    });
    await createNotification({
      type: "PROPOSAL_REVIEWED", recipientId: proposal.authorId,
      actorId: userId, link: `/propuestas/${id}`,
    });
    return NextResponse.json({ ok: true, status: "ACCEPTED" });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
