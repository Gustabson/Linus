import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, parseBody, rejectCrossOrigin, safeRemoteImageUrl, safeString, unauthorized } from "@/lib/api-helpers";
import { USER_BASIC_SELECT } from "@/lib/data";
import { findInternalTreeLink } from "@/lib/comments";
import type { Prisma } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rate-limit";

// ── GET /api/posts  (feed) ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab      = searchParams.get("tab") ?? "tendencias";
  const cursor   = searchParams.get("cursor");
  const since    = searchParams.get("since");    // poll: posts newer than this ISO date
  const username = searchParams.get("username"); // profile feed filter
  const limit    = 20;

  const session = await getSession();

  let whereClause: Prisma.PostWhereInput = {};

  // Profile feed: filter by a specific author's username
  if (username) {
    const author = await prisma.user.findUnique({
      where:  { username },
      select: { id: true },
    });
    if (!author) return NextResponse.json({ posts: [], nextCursor: null });
    whereClause.authorId = author.id;
  } else if (tab === "siguiendo" && session?.user?.id) {
    const follows = await prisma.userFollow.findMany({
      where:  { followerId: session.user.id },
      select: { followingId: true },
    });
    const ids = follows.map((f) => f.followingId);
    whereClause = { authorId: { in: ids } };
  }

  // `since` mode: return only posts newer than the given ISO timestamp (no pagination)
  if (since) {
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime()))
      return NextResponse.json({ error: "Parámetro since inválido" }, { status: 400 });

    const newPosts = await prisma.post.findMany({
      where:   { ...whereClause, createdAt: { gt: sinceDate } },
      orderBy: { createdAt: "desc" },
      take:    50, // cap — won't paginate new-post burst
      include: {
        author: { select: USER_BASIC_SELECT },
        tree: {
          select: {
            id: true, slug: true, title: true, description: true,
            contentType: true, forkDepth: true,
            owner: { select: { username: true, name: true } },
            _count: { select: { likes: true, forks: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
        likes:  session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
      },
    });
    return NextResponse.json(
      { posts: newPosts, nextCursor: null },
      { headers: { "Cache-Control": "no-store" } }, // polling — must be fresh
    );
  }

  const cursorDate = cursor ? new Date(cursor) : null;
  if (cursorDate && isNaN(cursorDate.getTime()))
    return NextResponse.json({ error: "Parámetro cursor inválido" }, { status: 400 });

  const posts = await prisma.post.findMany({
    where:   { ...whereClause, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    include: {
        author: { select: USER_BASIC_SELECT },
      tree: {
        select: {
          id: true, slug: true, title: true, description: true,
          contentType: true, forkDepth: true,
          owner: { select: { username: true, name: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes:  session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
  });

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  const nextCursor = hasMore ? posts[posts.length - 1].createdAt.toISOString() : null;

  const cacheHeader = session?.user?.id
    ? "no-store"
    : "public, s-maxage=30, stale-while-revalidate=60";

  return NextResponse.json(
    { posts, nextCursor },
    { headers: { "Cache-Control": cacheHeader } },
  );
}

// ── POST /api/posts  (create) ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = await enforceRateLimit({
    action: "post-create", userId: session.user.id, limit: 60, windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const body = await parseBody(req, 16_000);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { content, treeId, imageUrl } = body;
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const normalizedTreeId = treeId == null || treeId === "" ? null : safeString(treeId, 100);
  const normalizedImageUrl = imageUrl == null || imageUrl === "" ? null : safeRemoteImageUrl(imageUrl);

  if (treeId != null && treeId !== "" && !normalizedTreeId)
    return NextResponse.json({ error: "Contenido adjunto inválido" }, { status: 400 });
  if (imageUrl != null && imageUrl !== "" && !normalizedImageUrl)
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });

  if (!normalizedContent) {
    return NextResponse.json({ error: "El contenido no puede estar vacío" }, { status: 400 });
  }
  if (normalizedContent.length > 2000) {
    return NextResponse.json({ error: "Máximo 2000 caracteres" }, { status: 400 });
  }
  let resolvedTreeId = normalizedTreeId;
  if (!resolvedTreeId) {
    const internalLink = findInternalTreeLink(normalizedContent, req.nextUrl.origin);
    if (internalLink) {
      const linkedTree = await prisma.documentTree.findFirst({
        where: {
          slug: internalLink.slug,
          visibility: "PUBLIC",
          owner: { username: internalLink.username },
        },
        select: { id: true },
      });
      resolvedTreeId = linkedTree?.id ?? null;
    }
  }

  // Validate explicit and automatically resolved tree references.
  if (resolvedTreeId) {
    const tree = await prisma.documentTree.findUnique({
      where:  { id: resolvedTreeId },
      select: { visibility: true, ownerId: true },
    });
    if (!tree) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
    }
    if (tree.visibility === "PRIVATE" && tree.ownerId !== session.user.id) {
      return NextResponse.json({ error: "No tenés acceso a ese contenido" }, { status: 403 });
    }
  }

  const post = await prisma.post.create({
    data: {
      content:  normalizedContent,
      imageUrl: normalizedImageUrl,
      treeId:   resolvedTreeId,
      authorId: session.user.id,
    },
    include: {
        author: { select: USER_BASIC_SELECT },
      tree: {
        select: {
          id: true, slug: true, title: true, description: true,
          contentType: true, forkDepth: true,
          owner: { select: { username: true, name: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
