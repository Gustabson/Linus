import type { ContentType } from "@prisma/client";
import { LoginRequired } from "@/components/shared/LoginRequired";
import { WorkspaceDashboard, type WorkspaceTree } from "@/components/dashboard/WorkspaceDashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="Mi espacio" />;

  const { tab = "KERNEL" } = await searchParams;
  const initialTab = (["KERNEL", "MODULE", "RESOURCE"].includes(tab) ? tab : "KERNEL") as ContentType;

  const [allTrees, user] = await Promise.all([
    prisma.documentTree.findMany({
      where: { ownerId: session.user.id },
      include: {
        parentTree: { select: { slug: true, title: true, contentType: true } },
        _count: { select: { forks: true, likes: true, documents: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, username: true, image: true },
    }),
  ]);

  const trees: WorkspaceTree[] = allTrees.map((tree) => ({
    ...tree,
    updatedAt: tree.updatedAt.toISOString(),
  }));
  const username = user?.username ?? session.user.username ?? null;

  return (
    <WorkspaceDashboard
      initialTab={initialTab}
      trees={trees}
      user={{
        name: user?.name ?? session.user.name ?? null,
        username,
        image: user?.image ?? session.user.image ?? null,
      }}
      ownerPath={username ?? session.user.id}
    />
  );
}
