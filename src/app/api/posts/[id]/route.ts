import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { del } from "@vercel/blob";
import { isOwnedCommentUpload } from "@/lib/comments";

// ── DELETE /api/posts/[id] — only the post author can delete ──────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      authorId: true,
      comments: { select: { attachmentUrl: true, authorId: true } },
    },
  });

  if (!post)
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  if (post.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.post.delete({ where: { id } });

  const attachmentUrls = [...new Set(post.comments
    .filter((comment) => isOwnedCommentUpload(comment.attachmentUrl, comment.authorId))
    .map((comment) => comment.attachmentUrl as string))];
  if (attachmentUrls.length > 0) {
    const stillReferenced = await prisma.postComment.findMany({
      where: { attachmentUrl: { in: attachmentUrls } },
      select: { attachmentUrl: true },
    });
    const referencedUrls = new Set(stillReferenced.map((comment) => comment.attachmentUrl));
    const orphanedUrls = attachmentUrls.filter((url) => !referencedUrls.has(url));
    if (orphanedUrls.length > 0) {
      try { await del(orphanedUrls); } catch { /* Blob cleanup is best effort. */ }
    }
  }

  return NextResponse.json({ ok: true });
}
