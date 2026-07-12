import { describe, expect, it } from "vitest";
import {
  findInternalTreeLink,
  isOwnedCommentUpload,
  withoutLinkedTreeUrl,
} from "./comments";

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
