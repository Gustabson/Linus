import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { PostCard, type PostData } from "@/components/social/PostCard";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      content: true,
      author: { select: { name: true, username: true } },
      comments: {
        where: { id: query.comment && query.comment.length <= 64 ? query.comment : "__none__" },
        take: 1,
        select: { content: true, deletedAt: true, author: { select: { name: true, username: true } } },
      },
    },
  });
  if (!post) return { title: "Publicación no encontrada" };

  const comment = post.comments[0] ?? null;
  const author = comment?.author ?? post.author;
  const content = comment && !comment.deletedAt ? comment.content : post.content;
  const description = content.trim().replace(/\s+/g, " ").slice(0, 180)
    || "Conversación de la comunidad educativa en LINUG";
  const title = `${author.name ?? author.username ?? "Alguien"} en la comunidad`;

  return {
    title,
    description,
    alternates: { canonical: `/post/${id}${query.comment ? `?comment=${query.comment}` : ""}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/post/${id}${query.comment ? `?comment=${query.comment}` : ""}`,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function SharedPostPage({ params, searchParams }: PageProps) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, auth()]);
  const userId = session?.user?.id ?? null;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: USER_BASIC_SELECT },
      tree: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          contentType: true,
          forkDepth: true,
          owner: { select: { username: true, name: true } },
          _count: { select: { likes: true, forks: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes: userId ? { where: { userId }, select: { id: true } } : false,
    },
  });
  if (!post) notFound();
  if (query.comment) {
    if (query.comment.length > 64) notFound();
    const focusedComment = await prisma.postComment.findFirst({
      where: { id: query.comment, postId: id },
      select: { id: true },
    });
    if (!focusedComment) notFound();
  }

  const { updatedAt: _updatedAt, ...postWithoutUpdatedAt } = post;
  const serialized: PostData = {
    ...postWithoutUpdatedAt,
    likes: (post as typeof post & { likes?: { id: string }[] }).likes ?? [],
    createdAt: post.createdAt.toISOString(),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[760px] px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/feed" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a la comunidad
      </Link>
      <PostCard
        post={serialized}
        isAuthenticated={!!userId}
        currentUserId={userId}
        initialCommentsOpen={!!query.comment}
        focusedCommentId={query.comment ?? null}
      />
    </main>
  );
}
