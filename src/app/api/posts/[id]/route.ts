import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { del } from "@vercel/blob";
import { isOwnedCommentUpload } from "@/lib/comments";
import { isMissingDatabaseColumn } from "@/lib/prisma-errors";

// ── DELETE /api/posts/[id] — only the post author can delete ──────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  let post;
  try {
    post = await prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        comments: { select: { attachmentUrl: true, authorId: true } },
      },
    });
  } catch (error) {
    if (!isMissingDatabaseColumn(error)) throw error;
    const legacyPost = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    post = legacyPost ? { ...legacyPost, comments: [] } : null;
  }

  if (!post)
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  if (post.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.post.delete({ where: { id } });

  const attachmentUrls = post.comments
    .filter((comment) => isOwnedCommentUpload(comment.attachmentUrl, comment.authorId))
    .map((comment) => comment.attachmentUrl as string);
  if (attachmentUrls.length > 0) {
    try { await del(attachmentUrls); } catch { /* Blob cleanup is best effort. */ }
  }

  return NextResponse.json({ ok: true });
}
