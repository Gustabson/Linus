import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, GitCommit, Clock, GitBranch, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistorialPage({
  params,
}: {
  params: Promise<{ username: string; slug: string; docSlug: string }>;
}) {
  const { username, slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, title: true, slug: true, ownerId: true, visibility: true, owner: { select: { username: true } } },
  });
  if (!tree || tree.owner.username !== username) notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  const doc = await prisma.document.findUnique({
    where:  { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true, title: true },
  });
  if (!doc) notFound();

  const versions = await prisma.documentVersion.findMany({
    where:   { documentId: doc.id, status: "PUBLISHED" },
    include: { author: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Tree-level publications (to show publicIds)
  const publications = await prisma.treePublication.findMany({
    where:   { treeId: tree.id },
    orderBy: { publishedAt: "desc" },
    select:  { publicId: true, commitMessage: true, publishedAt: true },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href={`/${username}/${slug}`} className="hover:text-gray-900">{tree.title}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/${username}/${slug}/${docSlug}`} className="hover:text-gray-900">{doc.title}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Historial</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-green-600" />
          Historial de publicaciones
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {versions.length} versión{versions.length !== 1 ? "es" : ""} publicada{versions.length !== 1 ? "s" : ""} · {doc.title}
        </p>
      </div>

      {versions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
          <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Todavía no hay versiones publicadas.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {versions.map((v, idx) => {
              const isCurrent    = idx === 0;
              const matchingPub  = publications[idx];
              return (
                <div key={v.id} className="relative flex gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                    isCurrent ? "bg-green-100 ring-2 ring-green-400" : "bg-white ring-1 ring-gray-200"
                  }`}>
                    <GitCommit className={`w-4 h-4 ${isCurrent ? "text-green-600" : "text-gray-400"}`} />
                  </div>

                  <div className={`flex-1 bg-white rounded-2xl border p-4 mb-1 ${
                    isCurrent ? "border-green-200" : "border-gray-200"
                  }`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{v.commitMessage || "Publicación"}</p>
                          {isCurrent && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              Actual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(v.createdAt)}
                          </span>
                          {v.author && (
                            <span>
                              por{" "}
                              <Link
                                href={v.author.username ? `/${v.author.username}` : "#"}
                                className="text-green-700 hover:underline"
                              >
                                {v.author.name}
                              </Link>
                            </span>
                          )}
                        </div>
                      </div>

                      {matchingPub && (
                        <Link
                          href={`/v/${matchingPub.publicId}`}
                          className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-1"
                        >
                          {matchingPub.publicId}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
