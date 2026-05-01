import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ContentType } from "@prisma/client";

// GET /api/trees/search?q=&types=MODULE,RESOURCE&exclude=kernelId
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const typesParam = searchParams.get("types") ?? "MODULE,RESOURCE";
  const excludeKernelId = searchParams.get("exclude") ?? "";

  const types = typesParam
    .split(",")
    .filter((t) => ["KERNEL", "MODULE", "RESOURCE"].includes(t)) as ContentType[];

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
      visibility: "PUBLIC",
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(attachedIds.length ? { id: { notIn: attachedIds } } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      contentType: true,
      forkDepth: true,
      owner: { select: { name: true, username: true } },
      _count: { select: { likes: true, forks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Number(searchParams.get("limit") ?? "20"), 20),
  });

  return NextResponse.json({ trees });
}
