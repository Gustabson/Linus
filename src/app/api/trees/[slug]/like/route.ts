import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const tree = await prisma.documentTree.findUnique({ where: { slug } });
  if (!tree) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await prisma.treeLike.findUnique({
    where: { treeId_userId: { treeId: tree.id, userId: session.user.id } },
  });

  if (existing) {
    await prisma.treeLike.delete({ where: { id: existing.id } });
    const count = await prisma.treeLike.count({ where: { treeId: tree.id } });
    return NextResponse.json({ liked: false, count });
  } else {
    await prisma.treeLike.create({
      data: { treeId: tree.id, userId: session.user.id },
    });
    const count = await prisma.treeLike.count({ where: { treeId: tree.id } });
    return NextResponse.json({ liked: true, count });
  }
}
