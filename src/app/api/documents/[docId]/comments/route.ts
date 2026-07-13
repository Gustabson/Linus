import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { createNotification } from "@/lib/notifications";
import { getSession, unauthorized, forbidden, parseBody, rejectCrossOrigin, safeString } from "@/lib/api-helpers";

const COMMENT_MAX = 5_000;
const QUOTE_MAX = 1_000;
const SECTION_NAME_MAX = 200;

// ── shared helper ─────────────────────────────────────────────────────────────

/** Returns the document if the requester is allowed to see it, or null. */
async function getVisibleDoc(docId: string, userId?: string) {
  const doc = await prisma.document.findUnique({
    where:  { id: docId },
    select: {
      id:   true,
      slug: true,
      versions: { where: { status: "PUBLISHED" }, take: 1, select: { id: true } },
      tree: { select: { slug: true, ownerId: true, visibility: true, owner: { select: { username: true } } } },
    },
  });
  if (!doc) return null;

  // PRIVATE trees are only visible to the owner
  if (doc.tree.visibility === "PRIVATE" && doc.tree.ownerId !== userId) return null;
  if (doc.tree.ownerId !== userId && doc.versions.length === 0) return null;

  return doc;
}

// ── GET — list comments ───────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  const session   = await getSession();

  const doc = await getVisibleDoc(docId, session?.user?.id);
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const comments = await prisma.documentComment.findMany({
    where: {
      documentId: docId,
      // Private comments: only visible to their author
      OR: [
        { isPrivate: false },
        { isPrivate: true, authorId: session?.user?.id ?? "" },
      ],
    },
    include: {
      author: { select: USER_BASIC_SELECT },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

// ── POST — add a comment ──────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { docId } = await params;

  const doc = await getVisibleDoc(docId, session.user.id);
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const content = safeString(body.content, COMMENT_MAX);
  if (!content)
    return NextResponse.json({ error: `El comentario debe tener entre 1 y ${COMMENT_MAX} caracteres` }, { status: 400 });
  const quotedText = body.quotedText == null ? null : safeString(body.quotedText, QUOTE_MAX);
  const sectionType = body.sectionType == null ? null : safeString(body.sectionType, SECTION_NAME_MAX);
  if (body.quotedText != null && !quotedText)
    return NextResponse.json({ error: `La cita supera ${QUOTE_MAX} caracteres` }, { status: 400 });
  if (body.sectionType != null && !sectionType)
    return NextResponse.json({ error: "Sección inválida" }, { status: 400 });

  const comment = await prisma.documentComment.create({
    data: {
      documentId:  docId,
      authorId:    session.user.id,
      content,
      quotedText,
      sectionType,
      // Private feedback is handled by proposal conversations.
      isPrivate:   false,
    },
    include: {
      author: { select: USER_BASIC_SELECT },
    },
  });

  // Notify tree owner of public comments (not for own comments)
  if (!comment.isPrivate && doc.tree.visibility !== "PRIVATE" && doc.tree.ownerId !== session.user.id) {
    try {
      await createNotification({
        type:        "NEW_COMMENT",
        recipientId: doc.tree.ownerId,
        actorId:     session.user.id,
        link:        `/${doc.tree.owner.username ?? doc.tree.ownerId}/${doc.tree.slug}/${doc.slug}`,
      });
    } catch (error) {
      console.error("Failed to create comment notification", error);
    }
  }

  return NextResponse.json(comment, { status: 201 });
}

// ── DELETE — remove own comment ───────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();

  const { docId }     = await params;
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const commentId = safeString(body.commentId, 100);
  if (!commentId) return NextResponse.json({ error: "commentId inválido" }, { status: 400 });

  const comment = await prisma.documentComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.documentId !== docId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (comment.authorId !== session.user.id) return forbidden();

  await prisma.documentComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
