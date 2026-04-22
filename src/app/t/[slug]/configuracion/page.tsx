import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TreeSettingsForm } from "@/components/trees/TreeSettingsForm";

export const dynamic = "force-dynamic";

export default async function TreeSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true,
      description: true, visibility: true, isKernel: true,
      ownerId: true,
    },
  });

  if (!tree || tree.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">{tree.title}</p>
      </div>
      <TreeSettingsForm tree={tree} />
    </div>
  );
}
