import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { SECTION_ORDER, SECTION_LABELS, SECTION_DESCRIPTIONS, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { PreviewContent } from "@/components/documents/PreviewContent";

export const dynamic = "force-dynamic";

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string }>;
}) {
  const { slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true, ownerId: true, visibility: true, contentType: true },
  });

  if (!tree) notFound();
  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          author: { select: { name: true, image: true } },
          sections: { orderBy: { sectionOrder: "asc" } },
        },
      },
    },
  });

  if (!doc) notFound();

  const latestVersion = doc.versions[0];
  const sectionsMap = new Map(
    latestVersion?.sections.map((s) => [s.sectionType, s]) ?? []
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/t/${tree.slug}/${docSlug}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al documento
        </Link>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
          Vista previa
        </span>
      </div>

      {/* Title card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-3 text-center">
        {tree.contentType === "KERNEL" && (
          <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium mb-2">
            Kernel oficial
          </span>
        )}
        <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
        <p className="text-gray-500">{tree.title}</p>
        {latestVersion && (
          <p className="text-xs text-gray-400">
            Última actualización: {formatDate(latestVersion.createdAt)}
            {latestVersion.author.name && ` · ${latestVersion.author.name}`}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/t/${tree.slug}`}
            className="flex items-center gap-1.5 text-sm text-green-700 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Ver currículo completo
          </Link>
        </div>
      </div>

      {/* Table of contents */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-600" />
          Contenido
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_ORDER.map((type, i) => {
            const section = sectionsMap.get(type as keyof typeof sectionsMap extends string ? typeof type : never);
            return (
              <a
                key={type}
                href={`#section-${type}`}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                  section?.isComplete
                    ? "text-gray-700 hover:bg-green-50 hover:text-green-700"
                    : "text-gray-400 cursor-default"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {SECTION_LABELS[type]}
              </a>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTION_ORDER.map((type, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const section = sectionsMap.get(type as any);
          if (!section?.isComplete) return null;

          return (
            <div key={type} id={`section-${type}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Section header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900">{SECTION_LABELS[type]}</h2>
                  <p className="text-xs text-gray-400">{SECTION_DESCRIPTIONS[type]}</p>
                </div>
                {/* Meta badges */}
                <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                  {section.difficultyLevel && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {section.difficultyLevel === "BEGINNER" ? "Inicial" :
                       section.difficultyLevel === "INTERMEDIATE" ? "Intermedio" :
                       section.difficultyLevel === "ADVANCED" ? "Avanzado" : "Experto"}
                    </span>
                  )}
                  {section.ageRangeMin && section.ageRangeMax && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {section.ageRangeMin}–{section.ageRangeMax} años
                    </span>
                  )}
                  {section.durationMinutes && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {section.durationMinutes} min
                    </span>
                  )}
                </div>
              </div>

              {/* Rich text content */}
              <div className="px-6 py-5">
                <PreviewContent content={section.richTextContent as object} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pb-8 space-y-1">
        <p>Generado por EduHub · Conocimiento Educativo Abierto</p>
        <Link href={`/t/${tree.slug}/${docSlug}`} className="text-green-700 hover:underline">
          Ver versión completa con historial y comentarios
        </Link>
      </div>
    </div>
  );
}
