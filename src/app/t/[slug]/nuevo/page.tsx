import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { NewDocumentForm } from "@/components/trees/NewDocumentForm";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, title: true, slug: true, ownerId: true, contentType: true },
  });

  if (!tree || tree.ownerId !== session.user.id) notFound();

  const style = CONTENT_TYPE_STYLE[tree.contentType];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badgeCls}`}>
            {style.label}
          </span>
          <p className="text-sm text-gray-500">{tree.title}</p>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Nueva unidad</h1>
        <p className="text-gray-500 mt-1">
          El documento empieza vacío — vos elegís el nombre y la cantidad de secciones.
        </p>
      </div>
      <NewDocumentForm treeSlug={tree.slug} contentType={tree.contentType} />
    </div>
  );
}
