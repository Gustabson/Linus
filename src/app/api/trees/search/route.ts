import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ContentType } from "@prisma/client";
import { getSession, unauthorized } from "@/lib/api-helpers";

// GET /api/trees/search?q=&types=MODULE,RESOURCE&exclude=kernelId
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const scope = searchParams.get("scope") === "mine" ? "mine" : "global";
  const typesParam = searchParams.get("types") ?? "MODULE,RESOURCE";
  const excludeKernelId = searchParams.get("exclude") ?? "";

  const types = typesParam
    .split(",")
    .filter((t) => ["KERNEL", "MODULE", "RESOURCE"].includes(t)) as ContentType[];
  if (q.length > 100)
    return NextResponse.json({ error: "La búsqueda es demasiado larga" }, { status: 400 });
  if (types.length === 0)
    return NextResponse.json({ error: "Tipo de contenido inválido" }, { status: 400 });

  const session = scope === "mine" ? await getSession() : null;
  if (scope === "mine" && !session) return unauthorized();

  // Get IDs already attached to this kernel (to filter them out)
  let attachedIds: string[] = [];
  if (excludeKernelId) {
    const attachments = await prisma.treeAttachment.findMany({
      where: { kernelId: excludeKernelId },
      select: { contentId: true },
    });
    attachedIds = attachments.map((a) => a.contentId);
  }

  const trees = await prisma.documentTree.findMany({
    where: {
      contentType: { in: types },
      ...(scope === "mine"
        ? { ownerId: session!.user.id }
        : { visibility: "PUBLIC" as const }),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(attachedIds.length ? { id: { notIn: attachedIds } } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      contentType: true,
      visibility: true,
      forkDepth: true,
      owner: { select: { name: true, username: true } },
      _count: { select: { likes: true, forks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 20),
  });

  return NextResponse.json({ trees });
}
