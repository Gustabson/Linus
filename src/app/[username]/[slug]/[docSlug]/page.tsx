import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { DocumentWorkspace } from "@/components/documents/DocumentWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ username: string; slug: string; docSlug: string }> }) {
  const { slug, docSlug } = await params;
  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: { title: true, id: true, contentType: true, visibility: true },
  });
  if (!tree || tree.visibility === "PRIVATE") return {};
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
  params: Promise<{ username: string; slug: string; docSlug: string }>;
}) {
  const { username, slug, docSlug } = await params;
  const session = await auth();

  const tree = await prisma.documentTree.findUnique({
    where:  { slug },
    select: {
      id: true, title: true, slug: true, ownerId: true,
      visibility: true, contentType: true,
      owner: { select: { username: true } },
      documents: { orderBy: { createdAt: "asc" }, select: { id: true } },
      attachments: {
        where: { content: { contentType: "RESOURCE" } },
        orderBy: { addedAt: "asc" },
        include: {
          content: {
            select: {
              id: true, slug: true, title: true, description: true, contentType: true,
              resourceKind: true, resourceUrl: true, visibility: true,
              owner: { select: { name: true, username: true } },
              _count: { select: { likes: true, forks: true } },
            },
          },
        },
      },
    },
  });

  if (!tree || tree.owner.username !== username) notFound();

  const isOwner = session?.user?.id === tree.ownerId;
  if (tree.visibility === "PRIVATE" && !isOwner) notFound();

  const doc = await prisma.document.findUnique({
    where: { treeId_slug: { treeId: tree.id, slug: docSlug } },
    include: {
      versions: {
        where: isOwner ? undefined : { status: "PUBLISHED" },
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
  if (!isOwner && !latestVersion) notFound();
  const sections      = latestVersion?.sections ?? [];
  const hasChanges    = latestVersion?.status === "DRAFT";

  const latestPublication = isOwner
    ? await prisma.treePublication.findFirst({
        where:   { treeId: tree.id },
        orderBy: { publishedAt: "desc" },
        select:  { publicId: true },
      })
    : null;

  return (
    <DocumentWorkspace
      treeSlug={tree.slug}
      treeId={tree.id}
      treeTitle={tree.title}
      contentType={tree.contentType}
      docSlug={docSlug}
      docTitle={doc.title}
      docId={doc.id}
      documentIndex={Math.max(1, tree.documents.findIndex((item) => item.id === doc.id) + 1)}
      documentCount={Math.max(1, tree.documents.length)}
      ownerUsername={username}
      authorName={latestVersion?.author.name ?? username}
      versionStatus={latestVersion?.status ?? null}
      visibility={tree.visibility}
      sections={sections}
      isOwner={isOwner}
      isAuthenticated={!!session}
      currentUserId={session?.user?.id}
      initialPublicId={latestPublication?.publicId ?? null}
      hasChanges={hasChanges}
      initialResources={tree.attachments
        .filter((attachment) => isOwner || attachment.content.visibility !== "PRIVATE")
        .map((attachment) => ({ id: attachment.id, content: attachment.content }))}
    />
  );
}
