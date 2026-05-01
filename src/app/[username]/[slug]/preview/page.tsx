import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PreviewContent } from "@/components/documents/PreviewContent";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function KernelPreviewPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: {
      id: true, title: true, slug: true, description: true,
      ownerId: true, visibility: true, contentType: true,
      owner: { select: { name: true, username: true } },
      documents: {
        orderBy: { createdAt: "asc" },
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              author:   { select: { name: true } },
              sections: { orderBy: { sectionOrder: "asc" } },
            },
          },
        },
      },
      attachments: {
        orderBy: { addedAt: "asc" },
        include: {
          content: {
            select: {
              id: true, slug: true, title: true, contentType: true,
              owner: { select: { name: true, username: true } },
              documents: {
                orderBy: { createdAt: "asc" },
                take: 1,
                include: {
                  versions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: { sections: { orderBy: { sectionOrder: "asc" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tree || tree.owner.username !== username) notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  const style = CONTENT_TYPE_STYLE[tree.contentType];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${username}/${slug}`}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al kernel
        </Link>
        <span className="text-xs bg-border-subtle text-text-muted px-3 py-1 rounded-full">Vista previa</span>
      </div>

      {/* Title card */}
      <div className="bg-surface rounded-2xl border border-border p-8 space-y-3 text-center">
        <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${style.badgeCls}`}>
          {style.label}
        </span>
        <h1 className="text-3xl font-bold text-text">{tree.title}</h1>
        {tree.description && <p className="text-text-muted">{tree.description}</p>}
        <p className="text-xs text-text-subtle">
          por {tree.owner.name}
          {tree.documents.length > 0 && ` · ${tree.documents.length} documento${tree.documents.length !== 1 ? "s" : ""}`}
          {tree.attachments.length > 0 && ` · ${tree.attachments.length} adjunto${tree.attachments.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Table of contents */}
      {tree.documents.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Documentos
          </h2>
          <div className="space-y-1">
            {tree.documents.map((doc, di) => {
              const sections = doc.versions[0]?.sections ?? [];
              return (
                <div key={doc.id}>
                  <a href={`#doc-${doc.id}`} className="text-sm font-medium text-text hover:text-primary transition-colors">
                    {di + 1}. {doc.title}
                  </a>
                  {sections.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {sections.filter(s => s.isComplete).map((s, si) => (
                        <a key={s.id} href={`#section-${s.id}`}
                          className="block text-xs text-text-subtle hover:text-primary transition-colors">
                          {di + 1}.{si + 1} {s.sectionType}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents */}
      {tree.documents.map((doc, di) => {
        const sections = doc.versions[0]?.sections ?? [];
        const completeSections = sections.filter(s => s.isComplete);
        return (
          <div key={doc.id} id={`doc-${doc.id}`} className="space-y-4">
            {/* Doc title bar */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${style.iconBgCls} flex items-center justify-center text-sm font-bold shrink-0`}>
                {di + 1}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">{doc.title}</h2>
                {doc.versions[0] && (
                  <p className="text-xs text-text-subtle">
                    {formatDate(doc.versions[0].createdAt)}
                    {doc.versions[0].author.name && ` · ${doc.versions[0].author.name}`}
                  </p>
                )}
              </div>
            </div>

            {completeSections.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-dashed border-border p-8 text-center text-text-subtle text-sm">
                Este documento todavía no tiene secciones completadas.
              </div>
            ) : (
              completeSections.map((section, si) => {
                const content = section.richTextContent as Record<string, unknown>;
                const isPdfEmbed = content?.__type === "pdf_embed";
                return (
                  <div key={section.id} id={`section-${section.id}`}
                    className="bg-surface rounded-2xl border border-border overflow-hidden">
                    {/* Section header */}
                    <div className={`px-6 py-4 border-b border-border-subtle ${style.lightBgCls} flex items-center gap-3`}>
                      <span className={`w-7 h-7 rounded-full ${style.iconBgCls} text-sm font-medium flex items-center justify-center shrink-0`}>
                        {di + 1}.{si + 1}
                      </span>
                      <h3 className="font-semibold text-text">{section.sectionType}</h3>
                      <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                        {section.difficultyLevel && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {section.difficultyLevel === "BEGINNER" ? "Inicial" :
                             section.difficultyLevel === "INTERMEDIATE" ? "Intermedio" :
                             section.difficultyLevel === "ADVANCED" ? "Avanzado" : "Experto"}
                          </span>
                        )}
                        {section.ageRangeMin != null && section.ageRangeMax != null && (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            {section.ageRangeMin}–{section.ageRangeMax} años
                          </span>
                        )}
                        {section.durationMinutes && (
                          <span className="text-xs bg-border-subtle text-text-muted px-2 py-0.5 rounded-full">
                            {section.durationMinutes} min
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5">
                      {isPdfEmbed ? (
                        <iframe
                          src={content.url as string}
                          className="w-full rounded-lg border border-border"
                          style={{ height: "600px" }}
                          title={section.sectionType}
                        />
                      ) : (
                        <PreviewContent content={section.richTextContent as object} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}

      {/* Attached modules / resources */}
      {tree.attachments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Módulos y recursos adjuntos</h2>
          {tree.attachments.map((a) => {
            const ct     = CONTENT_TYPE_STYLE[a.content.contentType as keyof typeof CONTENT_TYPE_STYLE];
            const docSlug = a.content.documents[0]?.slug;
            const contentOwnerUsername = a.content.owner.username;
            return (
              <div key={a.id} className="bg-surface rounded-2xl border border-border p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.badgeCls}`}>
                    {ct.label}
                  </span>
                  <span className="font-medium text-text">{a.content.title}</span>
                  <span className="text-xs text-text-subtle">por {a.content.owner.name}</span>
                </div>
                {docSlug && contentOwnerUsername && (
                  <Link href={`/${contentOwnerUsername}/${a.content.slug}/${docSlug}/preview`}
                    className="text-xs text-text-muted hover:text-primary transition-colors whitespace-nowrap">
                    Ver preview →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-text-subtle pb-8">
        <Link href={`/${username}/${slug}`} className="text-primary hover:underline">
          Ver versión completa con edición, comentarios e historial
        </Link>
      </div>
    </div>
  );
}
