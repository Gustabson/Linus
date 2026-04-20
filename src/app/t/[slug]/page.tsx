import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate, SECTION_LABELS } from "@/lib/utils";
import { GitFork, BookOpen, Shield, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { ForkButton } from "@/components/trees/ForkButton";

export default async function TreePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      parentTree: { select: { slug: true, title: true } },
      forks: {
        where: { visibility: "PUBLIC" },
        take: 6,
        include: {
          owner: { select: { name: true } },
          _count: { select: { forks: true } },
        },
      },
      documents: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sections: { select: { sectionType: true, isComplete: true } },
            },
          },
        },
      },
      _count: { select: { forks: true } },
    },
  });

  if (!tree || tree.visibility === "PRIVATE") notFound();

  const isOwner = session?.user?.id === tree.ownerId;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      {tree.parentTree && (
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/t/${tree.parentTree.slug}`} className="hover:text-gray-900">
            {tree.parentTree.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{tree.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {tree.isKernel && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  Kernel oficial
                </span>
              )}
              {tree.forkDepth > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  Fork nivel {tree.forkDepth}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{tree.title}</h1>
            {tree.description && (
              <p className="text-gray-500">{tree.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isOwner && session && (
              <ForkButton treeId={tree.id} treeTitle={tree.title} />
            )}
            {isOwner && (
              <Link
                href={`/t/${tree.slug}/editar`}
                className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
              >
                Editar
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm text-gray-500 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {tree.owner.name}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-4 h-4" />
            {tree._count.forks} forks
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {tree.documents.length} documento{tree.documents.length !== 1 ? "s" : ""}
          </span>
          <span>{formatDate(tree.createdAt)}</span>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Documentos</h2>
        {tree.documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Todavía no hay documentos en este currículo.</p>
            {isOwner && (
              <Link
                href={`/t/${tree.slug}/nuevo`}
                className="mt-3 inline-block text-sm text-green-700 hover:underline"
              >
                + Crear primer documento
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tree.documents.map((doc) => {
              const latestVersion = doc.versions[0];
              const completeSections =
                latestVersion?.sections.filter((s) => s.isComplete).length ?? 0;
              const totalSections = 10;
              const progress = Math.round(
                (completeSections / totalSections) * 100
              );

              return (
                <Link
                  key={doc.id}
                  href={`/t/${tree.slug}/${doc.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-all block group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 group-hover:text-green-700">
                      {doc.title}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                  </div>

                  {/* Section pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {latestVersion?.sections.map((s) => (
                      <span
                        key={s.sectionType}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.isComplete
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {SECTION_LABELS[s.sectionType]}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Forks */}
      {tree.forks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GitFork className="w-5 h-5" />
            Forks de este currículo ({tree._count.forks})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tree.forks.map((fork) => (
              <Link
                key={fork.id}
                href={`/t/${fork.slug}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{fork.title}</p>
                <p className="text-xs text-gray-400 mt-1">
                  por {fork.owner.name} · {fork._count.forks} forks
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ledger link */}
      <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-green-600" />
        <span>
          Todos los cambios están registrados en el{" "}
          <Link href={`/ledger?tree=${tree.id}`} className="text-green-700 hover:underline">
            ledger criptográfico
          </Link>
          .
        </span>
      </div>
    </div>
  );
}
