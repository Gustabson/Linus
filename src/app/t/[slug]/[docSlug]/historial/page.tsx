import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, GitCommit, Shield, Clock, GitBranch } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistorialPage({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string }>;
}) {
  const { slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { id: true, title: true, slug: true, ownerId: true, visibility: true },
  });
  if (!tree) notFound();
  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    select: { id: true, title: true, currentVersionId: true },
  });
  if (!doc) notFound();

  const versions = await prisma.documentVersion.findMany({
    where:   { documentId: doc.id },
    include: { author: { select: { name: true, username: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href={`/t/${slug}`} className="hover:text-gray-900">{tree.title}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/t/${slug}/${docSlug}`} className="hover:text-gray-900">{doc.title}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Historial</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-green-600" />
          Historial de versiones
        </h1>
        <p className="text-sm text-gray-500 mt-1">{versions.length} versión{versions.length !== 1 ? "es" : ""} · {doc.title}</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-3">
          {versions.map((v, idx) => {
            const isCurrent = v.id === doc.currentVersionId;
            return (
              <div key={v.id} className="relative flex gap-4">
                {/* Dot */}
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                  isCurrent
                    ? "bg-green-100 ring-2 ring-green-400"
                    : "bg-white ring-1 ring-gray-200"
                }`}>
                  <GitCommit className={`w-4 h-4 ${isCurrent ? "text-green-600" : "text-gray-400"}`} />
                </div>

                {/* Card */}
                <div className={`flex-1 bg-white rounded-2xl border p-4 mb-1 ${
                  isCurrent ? "border-green-200" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{v.commitMessage}</p>
                        {isCurrent && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            Actual
                          </span>
                        )}
                        {idx === 0 && !isCurrent && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            Más reciente
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
                            por <Link href={v.author.username ? `/u/${v.author.username}` : "#"} className="text-green-700 hover:underline">
                              {v.author.name}
                            </Link>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hash */}
                    <div className="flex items-center gap-1 text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0"
                      title={v.contentHash}>
                      <Shield className="w-3 h-3 text-green-500" />
                      {v.contentHash.slice(0, 10)}…
                    </div>
                  </div>

                  {v.parentVersionId && (
                    <p className="text-xs text-gray-300 mt-2 font-mono">
                      ↳ {v.parentVersionId.slice(0, 8)}…
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
