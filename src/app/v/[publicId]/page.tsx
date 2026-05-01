import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GitCommit, ArrowRight, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PublicVersionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const publication = await prisma.treePublication.findUnique({
    where:   { publicId },
    include: {
      tree:   { select: { slug: true, title: true, contentType: true, visibility: true, owner: { select: { name: true, username: true } } } },
      author: { select: { name: true, username: true } },
    },
  });

  if (!publication || publication.tree.visibility === "PRIVATE") notFound();

  const badge = CONTENT_TYPE_STYLE[publication.tree.contentType];

  return (
    <div className="max-w-xl mx-auto py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
          <GitCommit className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-xs font-mono text-text-subtle mb-1">Versión publicada</p>
          <h1 className="text-3xl font-bold font-mono text-text">{publicId}</h1>
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-wide font-medium mb-1">Descripción</p>
          <p className="text-text font-medium text-base">{publication.commitMessage}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-text-subtle uppercase tracking-wide font-medium mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Fecha
            </p>
            <p className="text-text">{formatDate(publication.publishedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase tracking-wide font-medium mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Publicado por
            </p>
            <Link
              href={`/${publication.author.username}`}
              className="text-primary hover:underline"
            >
              {publication.author.name}
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle">
          <p className="text-xs text-text-subtle uppercase tracking-wide font-medium mb-2">Contenido</p>
          <Link
            href={`/${publication.tree.owner.username}/${publication.tree.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
          >
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.badgeCls}`}>
              {badge.label}
            </span>
            <span className="font-semibold text-text group-hover:text-primary transition-colors flex-1">
              {publication.tree.title}
            </span>
            <ArrowRight className="w-4 h-4 text-text-subtle group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-text-subtle">
        Este ID identifica de forma permanente el estado de este contenido en el momento de su publicación.
      </p>
    </div>
  );
}
