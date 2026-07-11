import { describe, expect, it } from "vitest";
import { sanitizeRichTextDocument } from "./sections";

describe("sanitizeRichTextDocument", () => {
  it("preserves supported TipTap content", () => {
    const input = {
      type: "doc",
      content: [{
        type: "heading",
        attrs: { level: 1, textAlign: "center", onclick: "alert(1)" },
        content: [{ type: "text", text: "Título", marks: [{ type: "bold" }] }],
      }],
    };
    expect(sanitizeRichTextDocument(input)).toEqual({
      type: "doc",
      content: [{
        type: "heading",
        attrs: { level: 1, textAlign: "center" },
        content: [{ type: "text", text: "Título", marks: [{ type: "bold" }] }],
      }],
    });
  });

  it("removes unsafe links and unknown nodes", () => {
    const input = {
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "bad" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ],
    };
    expect(sanitizeRichTextDocument(input)).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "link" }] }],
    });
  });

  it("normalizes safe links", () => {
    const result = sanitizeRichTextDocument({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Open", marks: [{ type: "link", attrs: { href: "https://example.com/a" } }] }],
      }],
    });
    expect(result).toMatchObject({
      content: [{ content: [{ marks: [{ attrs: { href: "https://example.com/a", rel: "noopener noreferrer" } }] }] }],
    });
  });

  it("rejects malformed roots and oversized documents", () => {
    expect(sanitizeRichTextDocument({ type: "paragraph" })).toBeNull();
    expect(sanitizeRichTextDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(1_100_000) }] }] })).toBeNull();
  });
});
