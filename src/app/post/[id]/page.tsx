import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_BASIC_SELECT } from "@/lib/data";
import { PostCard, type PostData } from "@/components/social/PostCard";

export default async function SharedPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
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
