import type { ContentType } from "@prisma/client";

export const MAX_COMMENT_LENGTH = 500;
export const COMMENT_PAGE_SIZE = 30;
export const MAX_COMMENT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const COMMENT_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.pdf,.docx";

export const COMMENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export interface CommentAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface SharedTreeData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  forkDepth: number;
  owner: { username: string | null; name: string | null };
  _count: { likes: number; forks: number };
}

export interface SocialCommentData {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  parentId: string | null;
  linkedTree: SharedTreeData | null;
  _count: { likes: number; replies: number };
  likes: { id: string }[];
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

export interface InternalTreeLink {
  matchedText: string;
  username: string;
  slug: string;
}

export interface CommentTextSegment {
  text: string;
  href: string | null;
}

export function buildCommentPage<T extends { id: string }>(items: T[], total: number | null) {
  const hasMore = items.length > COMMENT_PAGE_SIZE;
  const comments = hasMore ? items.slice(0, COMMENT_PAGE_SIZE) : items;
  return {
    comments,
    total,
    hasMore,
    nextCursor: hasMore ? comments[comments.length - 1].id : null,
    pageSize: COMMENT_PAGE_SIZE,
  };
}

const LINK_CANDIDATE = /https?:\/\/[^\s<>"']+|\/[\p{L}\p{N}_.-]+\/[\p{L}\p{N}_.-]+(?:\/[\p{L}\p{N}_.-]+)*(?:\?[^\s<>"']*)?/giu;

function trimTrailingPunctuation(value: string) {
  return value.replace(/[),.;!?]+$/u, "");
}

/** Splits comment text into safe plain-text and http(s)/internal-link segments. */
export function linkifyCommentText(content: string): CommentTextSegment[] {
  const segments: CommentTextSegment[] = [];
  let cursor = 0;

  for (const rawMatch of content.matchAll(LINK_CANDIDATE)) {
    const index = rawMatch.index ?? 0;
    const linkText = trimTrailingPunctuation(rawMatch[0]);
    if (!linkText) continue;
    if (index > cursor) segments.push({ text: content.slice(cursor, index), href: null });
    segments.push({ text: linkText, href: linkText });
    cursor = index + linkText.length;
  }

  if (cursor < content.length) segments.push({ text: content.slice(cursor), href: null });
  return segments.length > 0 ? segments : [{ text: content, href: null }];
}

function decodedPathParts(pathname: string) {
  try {
    return pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

/** Finds the first tree link that belongs to this installation.
 * Deep links such as /user/tree/document resolve to the owning tree as well.
 */
export function findInternalTreeLink(
  content: string,
  requestOrigin: string,
): InternalTreeLink | null {
  const origin = new URL(requestOrigin);

  for (const rawMatch of content.matchAll(LINK_CANDIDATE)) {
    const matchedText = trimTrailingPunctuation(rawMatch[0]);
    let parsed: URL;
    try {
      parsed = new URL(matchedText, origin);
    } catch {
      continue;
    }

    if (parsed.origin !== origin.origin) continue;
    const parts = decodedPathParts(parsed.pathname);
    if (!parts || parts.length < 2 || !parts[0] || !parts[1]) continue;

    return { matchedText, username: parts[0], slug: parts[1] };
  }

  return null;
}

/** Removes only the URL represented by a resolved tree preview. */
export function withoutLinkedTreeUrl(
  content: string,
  tree: Pick<SharedTreeData, "slug" | "owner">,
) {
  if (!tree.owner.username) return content.trim();

  for (const rawMatch of content.matchAll(LINK_CANDIDATE)) {
    const matchedText = trimTrailingPunctuation(rawMatch[0]);
    let parsed: URL;
    try {
      parsed = new URL(matchedText, "https://local.invalid");
    } catch {
      continue;
    }
    const parts = decodedPathParts(parsed.pathname);
    if (parts?.[0] === tree.owner.username && parts[1] === tree.slug) {
      return `${content.slice(0, rawMatch.index)}${content.slice((rawMatch.index ?? 0) + rawMatch[0].length)}`
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  }

  return content.trim();
}

export function isCommentAttachmentType(type: unknown): type is string {
  return typeof type === "string" && COMMENT_ATTACHMENT_MIME_TYPES.has(type);
}

export function isOwnedCommentUpload(url: unknown, userId: string): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname.endsWith(".public.blob.vercel-storage.com")
      && parsed.pathname.startsWith(`/comments/${encodeURIComponent(userId)}/`);
  } catch {
    return false;
  }
}
