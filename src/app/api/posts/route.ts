import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

// ── GET /api/posts  (feed) ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab      = searchParams.get("tab") ?? "tendencias";
  const cursor   = searchParams.get("cursor");
  const since    = searchParams.get("since");    // poll: posts newer than this ISO date
  const username = searchParams.get("username"); // profile feed filter
  const limit    = 20;

  const session = await getSession();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let whereClause: Record<string, any> = {};

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
    const newPosts = await prisma.post.findMany({
      where:   { ...whereClause, createdAt: { gt: new Date(since) } },
      orderBy: { createdAt: "desc" },
      take:    50, // cap — won't paginate new-post burst
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
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
    return NextResponse.json({ posts: newPosts, nextCursor: null });
  }

  const posts = await prisma.post.findMany({
    where:   { ...whereClause, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
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

  return NextResponse.json({ posts, nextCursor });
}

// ── POST /api/posts  (create) ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { content, treeId, imageUrl } = await req.json().catch(() => ({}));

  if (!content?.trim()) {
    return NextResponse.json({ error: "El contenido no puede estar vacío" }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Máximo 2000 caracteres" }, { status: 400 });
  }

  // Validate treeId belongs to a public tree (or owned by author)
  if (treeId) {
    const tree = await prisma.documentTree.findUnique({
      where:  { id: treeId },
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
      content:  content.trim(),
      imageUrl: imageUrl ?? null,
      treeId:   treeId ?? null,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
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
