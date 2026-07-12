import { describe, expect, it } from "vitest";
import {
  buildCommentPage,
  findInternalTreeLink,
  isOwnedCommentUpload,
  withoutLinkedTreeUrl,
} from "./comments";

describe("comment pagination", () => {
  it("returns 30 comments and a cursor when another page exists", () => {
    const page = buildCommentPage(
      Array.from({ length: 31 }, (_, index) => ({ id: `comment-${index}` })),
      100_000,
    );
    expect(page.comments).toHaveLength(30);
    expect(page.nextCursor).toBe("comment-29");
    expect(page.hasMore).toBe(true);
    expect(page.total).toBe(100_000);
  });

  it("does not expose a cursor for the final page", () => {
    const page = buildCommentPage([{ id: "only-comment" }], 1);
    expect(page.nextCursor).toBeNull();
    expect(page.hasMore).toBe(false);
  });

  it("allows subsequent pages to omit the expensive total count", () => {
    expect(buildCommentPage([{ id: "next" }], null).total).toBeNull();
  });
});

describe("comment links", () => {
  it("finds a tree link from the current installation", () => {
    expect(findInternalTreeLink(
      "Mirá https://linus.edu/ana/matematica.",
      "https://linus.edu",
    )).toEqual({
      matchedText: "https://linus.edu/ana/matematica",
      username: "ana",
      slug: "matematica",
    });
  });

  it("does not resolve links from another host", () => {
    expect(findInternalTreeLink(
      "https://example.com/ana/matematica",
      "https://linus.edu",
    )).toBeNull();
  });

  it("resolves a document deep link to its tree", () => {
    expect(findInternalTreeLink(
      "https://linus.edu/ana/matematica/leccion-1",
      "https://linus.edu",
    )).toMatchObject({ username: "ana", slug: "matematica" });
  });

  it("ignores malformed percent-encoding instead of throwing", () => {
    expect(findInternalTreeLink("https://linus.edu/ana/%E0%A4%A", "https://linus.edu")).toBeNull();
  });

  it("removes the resolved link without removing surrounding text", () => {
    expect(withoutLinkedTreeUrl(
      "Muy útil: https://linus.edu/ana/matematica",
      { slug: "matematica", owner: { username: "ana", name: "Ana" } },
    )).toBe("Muy útil:");
  });

  it("does not leave punctuation behind when the link is the whole message", () => {
    expect(withoutLinkedTreeUrl(
      "https://linus.edu/ana/matematica.",
      { slug: "matematica", owner: { username: "ana", name: "Ana" } },
    )).toBe("");
  });
});

describe("comment uploads", () => {
  it("accepts only the authenticated user's comment directory", () => {
    expect(isOwnedCommentUpload(
      "https://store.public.blob.vercel-storage.com/comments/user-1/file.pdf",
      "user-1",
    )).toBe(true);
    expect(isOwnedCommentUpload(
      "https://store.public.blob.vercel-storage.com/comments/user-2/file.pdf",
      "user-1",
    )).toBe(false);
    expect(isOwnedCommentUpload("https://evil.test/comments/user-1/file.pdf", "user-1")).toBe(false);
  });
});
