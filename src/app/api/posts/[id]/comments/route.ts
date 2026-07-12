import { del, head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { getSession, parseBody, rejectCrossOrigin, unauthorized } from "@/lib/api-helpers";
import {
  findInternalTreeLink,
  buildCommentPage,
  isCommentAttachmentType,
  isOwnedCommentUpload,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_LENGTH,
  COMMENT_PAGE_SIZE,
  type CommentAttachment,
} from "@/lib/comments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

const LINKED_TREE_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  contentType: true,
  forkDepth: true,
  visibility: true,
  ownerId: true,
  owner: { select: { username: true, name: true } },
  _count: { select: { likes: true, forks: true } },
} as const;

const COMMENT_BASE_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  author: { select: USER_BASIC_SELECT },
} as const;

function richCommentSelect(viewerId: string | null) {
  return {
    ...COMMENT_BASE_SELECT,
    attachmentUrl: true,
    attachmentName: true,
    attachmentType: true,
    attachmentSize: true,
    parentId: true,
    linkedTree: { select: LINKED_TREE_SELECT },
    _count: { select: { likes: true, replies: true } },
    likes: {
      where: { userId: viewerId ?? "__guest__" },
      select: { id: true },
    },
  } as const;
}

async function normalizeAttachment(input: unknown, userId: string): Promise<CommentAttachment | null> {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;

  if (!isOwnedCommentUpload(value.url, userId)
    || typeof value.name !== "string"
    || value.name.trim().length === 0
    || value.name.length > 255
    || !isCommentAttachmentType(value.type)
    || !Number.isSafeInteger(value.size)
    || Number(value.size) <= 0
    || Number(value.size) > MAX_COMMENT_ATTACHMENT_BYTES) {
    return null;
  }

  // Blob metadata is authoritative; the browser-supplied type and size are not.
  try {
    const blob = await head(value.url);
    if (blob.size !== Number(value.size)
      || blob.contentType !== value.type
      || blob.size > MAX_COMMENT_ATTACHMENT_BYTES) return null;
  } catch {
    return null;
  }

  return {
    url: value.url,
    name: value.name.trim(),
    type: value.type,
    size: Number(value.size),
  };
}

function safeComment<T extends { linkedTree: null | ({ visibility: string; ownerId: string } & Record<string, unknown>) }>(
  comment: T,
  viewerId: string | null,
) {
  const linkedTree = comment.linkedTree;
  const canSeeTree = linkedTree
    && (linkedTree.visibility === "PUBLIC" || linkedTree.ownerId === viewerId);
  if (!canSeeTree) return { ...comment, linkedTree: null };
  const { visibility: _visibility, ownerId: _ownerId, ...safeTree } = linkedTree;
  return { ...comment, linkedTree: safeTree };
}

async function deleteAttachmentIfUnreferenced(url: string | null, userId: string) {
  if (!isOwnedCommentUpload(url, userId)) return;
  const referenced = await prisma.postComment.findFirst({
    where: { attachmentUrl: url },
    select: { id: true },
  });
  if (referenced) return;
  try { await del(url); } catch { /* Blob cleanup is best effort. */ }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const parentId = req.nextUrl.searchParams.get("parentId");
  const focusId = req.nextUrl.searchParams.get("focusId");
  if ([cursor, parentId, focusId].some((value) => value && value.length > 64))
    return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });

  const session = await getSession();
  if (parentId) {
    const parent = await prisma.postComment.findFirst({
      where: { id: parentId, postId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Comentario padre no encontrado" }, { status: 404 });
  }

  const where = focusId
    ? { postId, id: focusId }
    : { postId, parentId: parentId ?? null };

  // A cursor is valid only in the exact thread being paginated.
  if (cursor) {
    const validCursor = await prisma.postComment.findFirst({
      where: { ...where, id: cursor },
      select: { id: true },
    });
    if (!validCursor)
      return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
  }

  try {
    const [comments, total] = await Promise.all([
      prisma.postComment.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: COMMENT_PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: richCommentSelect(session?.user.id ?? null),
      }),
      // Later pages do not need to repeat an increasingly expensive count.
      cursor ? Promise.resolve(null) : prisma.postComment.count({ where }),
    ]);

    return NextResponse.json(buildCommentPage(
      comments.map((comment) => safeComment(comment, session?.user.id ?? null)),
      total,
    ));
  } catch (error) {
    console.error("Failed to load post comments", error);
    return NextResponse.json({ error: "No se pudieron cargar los comentarios" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "comment:create", userId: session.user.id, limit: 15, windowMs: 60_000,
  });
  if (limited) return limited;

  const { id: postId } = await params;
  const body = await parseBody(req, 32_000);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const attachment = await normalizeAttachment(body.attachment, session.user.id);
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;

  if (!content && !attachment)
    return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
  if (body.attachment && !attachment)
    return NextResponse.json({ error: "El archivo adjunto no es válido" }, { status: 400 });
  if (content.length > MAX_COMMENT_LENGTH)
    return NextResponse.json({ error: `Máximo ${MAX_COMMENT_LENGTH} caracteres` }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  if (attachment) {
    const alreadyPublished = await prisma.postComment.findFirst({
      where: { attachmentUrl: attachment.url },
      select: { id: true },
    });
    if (alreadyPublished) {
      return NextResponse.json(
        { error: "Ese archivo ya fue publicado en otro comentario." },
        { status: 409 },
      );
    }
  }
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await prisma.postComment.findFirst({
      where: { id: parentId, postId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!parent) return NextResponse.json({ error: "Comentario padre no encontrado" }, { status: 404 });
    parentAuthorId = parent.authorId;
  }

  const internalLink = content ? findInternalTreeLink(content, req.nextUrl.origin) : null;
  const linkedTree = internalLink
    ? await prisma.documentTree.findFirst({
        where: {
          slug: internalLink.slug,
          visibility: "PUBLIC",
          owner: { username: internalLink.username },
        },
        select: { id: true },
      })
    : null;

  const comment = await prisma.postComment.create({
    data: {
      content,
      postId,
      authorId: session.user.id,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentSize: attachment?.size,
      linkedTreeId: linkedTree?.id,
      parentId,
    },
    select: richCommentSelect(session.user.id),
  });
  await createNotification({
    type: "NEW_COMMENT",
    recipientId: parentAuthorId ?? post.authorId,
    actorId: session.user.id,
    link: `/post/${postId}?comment=${comment.id}`,
  });
  return NextResponse.json({ comment: safeComment(comment, session.user.id) }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "comment:delete", userId: session.user.id, limit: 20, windowMs: 60_000,
  });
  if (limited) return limited;

  const { id: postId } = await params;
  const body = await parseBody(req, 4_000);
  const commentId = body?.commentId;
  if (typeof commentId !== "string" || !commentId)
    return NextResponse.json({ error: "commentId requerido" }, { status: 400 });

  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      postId: true,
      attachmentUrl: true,
      deletedAt: true,
      _count: { select: { replies: true } },
    },
  });
  if (!comment || comment.postId !== postId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (comment.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (comment.deletedAt)
    return NextResponse.json({ error: "El comentario ya fue eliminado" }, { status: 409 });

  // Keep replies written by other people. The deleted parent becomes a
  // structural placeholder instead of cascading through the whole thread.
  if (comment._count.replies > 0) {
    const [, tombstone] = await prisma.$transaction([
      prisma.postCommentLike.deleteMany({ where: { commentId } }),
      prisma.postComment.update({
        where: { id: commentId },
        data: {
          content: "",
          attachmentUrl: null,
          attachmentName: null,
          attachmentType: null,
          attachmentSize: null,
          linkedTreeId: null,
          deletedAt: new Date(),
        },
        select: richCommentSelect(session.user.id),
      }),
    ]);
    await deleteAttachmentIfUnreferenced(comment.attachmentUrl, session.user.id);
    return NextResponse.json({ ok: true, removed: false, comment: safeComment(tombstone, session.user.id) });
  }

  await prisma.postComment.delete({ where: { id: commentId } });
  await deleteAttachmentIfUnreferenced(comment.attachmentUrl, session.user.id);
  return NextResponse.json({ ok: true, removed: true });
}
