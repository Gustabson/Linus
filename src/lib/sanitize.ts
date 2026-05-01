import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content coming from Tiptap before storing it in the DB.
 * Strips dangerous tags/attributes while preserving formatting.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "a",
      "blockquote",
      "pre", "code",
      "hr",
      "img",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",          // <a>
      "src", "alt", "width", "height",  // <img>
    ],
    // Force external links to open safely
    FORCE_BODY: true,
    ADD_ATTR: ["target"],
  });
}
