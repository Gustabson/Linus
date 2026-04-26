import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string; docSlug: string }> }) {
  const { slug, docSlug } = await params;
  const tree = await prisma.documentTree.findUnique({ where: { slug }, select: { title: true, id: true } });
  if (!tree) return {};
  const doc = await prisma.document.findUnique({
    where:  { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { title: true },
  });
  if (!doc) return {};
  return {
    title:     `${doc.title} — ${tree.title}`,
    openGraph: { title: `${doc.title} — ${tree.title}`, type: "article" },
  };
}
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, Clock, Users, Shield, Eye, GitBranch } from "lucide-react";
import { DocumentCommentsWrapper } from "@/components/documents/DocumentCommentsWrapper";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string }>;
}) {
  const { slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true, ownerId: true, visibility: true },
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
  const sections = latestVersion?.sections ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/t/${tree.slug}`} className="hover:text-gray-900">
          {tree.title}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
            {latestVersion && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {latestVersion.author.name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(latestVersion.createdAt)}
                </span>
                <span className="flex items-center gap-1 font-mono text-xs">
                  <Shield className="w-4 h-4 text-green-600" />
                  {latestVersion.contentHash.slice(0, 12)}…
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/t/${tree.slug}/${docSlug}/historial`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              title="Ver historial de versiones"
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
