import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── DELETE /api/posts/[id] — only the post author can delete ──────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where:  { id },
    select: { authorId: true },
  });

  if (!post)
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  if (post.authorId !== session.user.id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
