import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { getSession, unauthorized } from "@/lib/api-helpers";
import {
  findInternalTreeLink,
  isCommentAttachmentType,
  isOwnedCommentUpload,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_LENGTH,
  type CommentAttachment,
} from "@/lib/comments";

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

function normalizeAttachment(input: unknown, userId: string): CommentAttachment | null {
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

  return {
    url: value.url,
    name: value.name.trim(),
    type: value.type,
    size: Number(value.size),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const session = await getSession();
  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: USER_BASIC_SELECT },
      linkedTree: { select: LINKED_TREE_SELECT },
    },
  });

  return NextResponse.json({
    comments: comments.map((comment) => {
      const linkedTree = comment.linkedTree;
      const canSeeTree = linkedTree
        && (linkedTree.visibility === "PUBLIC" || linkedTree.ownerId === session?.user.id);
      if (!canSeeTree) return { ...comment, linkedTree: null };
      const { visibility: _visibility, ownerId: _ownerId, ...safeTree } = linkedTree;
      return { ...comment, linkedTree: safeTree };
    }),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: postId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const attachment = normalizeAttachment(body.attachment, session.user.id);

  if (!content && !attachment)
    return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
  if (body.attachment && !attachment)
    return NextResponse.json({ error: "El archivo adjunto no es válido" }, { status: 400 });
  if (content.length > MAX_COMMENT_LENGTH)
    return NextResponse.json({ error: `Máximo ${MAX_COMMENT_LENGTH} caracteres` }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

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
    },
    include: {
      author: { select: USER_BASIC_SELECT },
      linkedTree: { select: LINKED_TREE_SELECT },
    },
  });

  if (!comment.linkedTree) return NextResponse.json({ comment }, { status: 201 });
  const { visibility: _visibility, ownerId: _ownerId, ...safeTree } = comment.linkedTree;
  return NextResponse.json({ comment: { ...comment, linkedTree: safeTree } }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id: postId } = await params;
  const { commentId } = await req.json().catch(() => ({}));
  if (!commentId)
    return NextResponse.json({ error: "commentId requerido" }, { status: 400 });

  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true, attachmentUrl: true },
  });
  if (!comment || comment.postId !== postId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (comment.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.postComment.delete({ where: { id: commentId } });
  if (isOwnedCommentUpload(comment.attachmentUrl, session.user.id)) {
    try { await del(comment.attachmentUrl); } catch { /* Blob cleanup is best effort. */ }
  }
  return NextResponse.json({ ok: true });
}
