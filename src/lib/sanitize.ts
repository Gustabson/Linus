import sanitizeHtmlLib from "sanitize-html";

/**
 * Sanitizes HTML content coming from Tiptap before storing it in the DB.
 * Uses sanitize-html (pure Node.js, no DOM dependency) — safe for Vercel Edge/Lambda.
 * Strips dangerous tags/attributes while preserving all Tiptap formatting.
 */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "a",
      "blockquote",
      "pre", "code",
      "hr",
      "img",
    ],
    allowedAttributes: {
      "a":   ["href", "target", "rel"],
      "img": ["src", "alt", "width", "height"],
      // Allow style only for text-align (Tiptap text-align extension)
      "*":   ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
      },
    },
    // Force all external links to open safely
    transformTags: {
      "a": sanitizeHtmlLib.simpleTransform("a", {
        target: "_blank",
        rel:    "noopener noreferrer",
      }),
    },
  });
}
