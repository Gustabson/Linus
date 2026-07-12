import type { ContentType } from "@prisma/client";

export const MAX_COMMENT_LENGTH = 500;
export const MAX_COMMENT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const COMMENT_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.pdf,.doc,.docx";

export const COMMENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
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
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  linkedTree: SharedTreeData | null;
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

const LINK_CANDIDATE = /https?:\/\/[^\s<>"']+|\/[\p{L}\p{N}_.-]+\/[\p{L}\p{N}_.-]+(?:\?[^\s<>"']*)?/giu;

function trimTrailingPunctuation(value: string) {
  return value.replace(/[),.;!?]+$/u, "");
}

/** Finds the first two-segment link that belongs to this installation. */
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
    const parts = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length !== 2 || !parts[0] || !parts[1]) continue;

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
    const parts = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] === tree.owner.username && parts[1] === tree.slug) {
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
