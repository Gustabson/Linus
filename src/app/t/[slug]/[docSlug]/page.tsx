import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Clock, Users, Eye, GitBranch } from "lucide-react";
import { DocumentCommentsWrapper } from "@/components/documents/DocumentCommentsWrapper";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import { TreePublishButton } from "@/components/trees/TreePublishButton";
import { DocActionBar } from "@/components/documents/DocActionBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string; docSlug: string }> }) {
  const { slug, docSlug } = await params;
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { title: true, id: true, contentType: true },
  });
  if (!tree) return {};
  const doc = await prisma.document.findUnique({
    where:  { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { title: true },
  });
  if (!doc) return {};
  // For MODULE/RESOURCE the tree title IS the entity — don't duplicate
  const pageTitle = tree.contentType === "KERNEL"
    ? `${doc.title} — ${tree.title}`
    : tree.title;
  return {
    title:     pageTitle,
    openGraph: { title: pageTitle, type: "article" },
  };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string }>;
}) {
  const { slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, title: true, slug: true, ownerId: true, visibility: true, contentType: true, contentHash: true },
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
          author: { select: { name: true } },
          sections: { orderBy: { sectionOrder: "asc" } },
        },
      },
    },
  });

  if (!doc) notFound();

  const latestVersion = doc.versions[0];
  const sections      = latestVersion?.sections ?? [];
  const style         = CONTENT_TYPE_STYLE[tree.contentType];
  const isKernel      = tree.contentType === "KERNEL";

  // For module/resource: is there a DRAFT (unpublished edits since last tree-publish)?
  const hasChanges = !isKernel && latestVersion?.status === "DRAFT";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {isKernel && isOwner ? (
          /* Kernel doc: DocActionBar handles breadcrumb + title + actions */
          <DocActionBar
            treeSlug={tree.slug}
            treeTitle={tree.title}
            docSlug={docSlug}
            docTitle={doc.title}
          />
        ) : (
          /* Module / resource: keep the full header with title + actions */
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${style.badgeCls}`}>
                {style.icon}
                {style.label}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{tree.title}</h1>
              {latestVersion && (
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {latestVersion.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(latestVersion.createdAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isOwner && (
                <TreePublishButton
                  treeSlug={tree.slug}
                  contentType={tree.contentType}
                  initialHash={tree.contentHash ?? null}
                  hasChanges={hasChanges}
                />
              )}
              <Link
                href={`/t/${tree.slug}/${docSlug}/historial`}
                className={`flex items-center gap-1.5 text-sm text-gray-500 ${style.hoverTextCls} transition-colors`}
                title="Ver historial de publicaciones"
              >
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">Historial</span>
              </Link>
              <Link
                href={`/t/${tree.slug}/${docSlug}/preview`}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Sections + Comments (client wrapper handles quote state) */}
      <DocumentCommentsWrapper
        treeSlug={tree.slug}
        docSlug={docSlug}
        docId={doc.id}
        versionId={latestVersion?.id ?? null}
        sections={sections}
        isOwner={isOwner}
        isAuthenticated={!!session}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
