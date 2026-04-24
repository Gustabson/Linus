import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const kernels = await prisma.documentTree.findMany({
    where: { ownerId: session.user.id, contentType: "KERNEL" },
    select: { id: true, slug: true, title: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(kernels);
}
