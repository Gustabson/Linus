import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TreeSettingsForm } from "@/components/trees/TreeSettingsForm";

export const dynamic = "force-dynamic";

export default async function TreeSettingsPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true,
      description: true, visibility: true, contentType: true,
      ownerId: true,
      owner: { select: { username: true } },
    },
  });

  if (!tree || tree.owner.username !== username || tree.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text">Configuración</h1>
        <p className="text-text-muted mt-1">{tree.title}</p>
      </div>
      <TreeSettingsForm tree={tree} ownerUsername={username} />
    </div>
  );
}
