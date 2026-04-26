/**
 * Utilities for converting imported Word/PDF text into the TipTap JSON
 * format used by DocumentSection.richTextContent.
 */

/** Convert a block of plain text into a TipTap doc with paragraph nodes. */
export function textToTipTapDoc(text: string): object {
  const content = text
    .split(/\n{2,}/)
    .map((s) => s.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] }));

  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}

/**
 * Split a long plain-text string into logical sections.
 *
 * Heading detection heuristic:
 *  - Line is 2–80 chars long
 *  - Does NOT end with sentence-ending punctuation
 *  - Preceded by a blank line (or is the very first non-empty content)
 *  - Is not a numbered list item (1. Something)
 */
export function splitTextIntoSections(
  text: string,
  defaultTitle = "Contenido"
): { title: string; richTextContent: object }[] {
  const lines = text.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  let currentTitle: string = defaultTitle;
  let currentLines: string[] = [];
  let prevWasBlank = true;
  let firstSection = true;

  for (const line of lines) {
    const trimmed = line.trim();
    const isBlank = trimmed === "";

    const isHeading =
      !isBlank &&
      prevWasBlank &&
      trimmed.length >= 2 &&
      trimmed.length <= 80 &&
      !/[.!?,;:]$/.test(trimmed) &&
      !/^\d+[\.\)]/.test(trimmed); // not "1. Item"

    if (isHeading) {
      const hasContent = currentLines.some((l) => l.trim());
      if (hasContent) {
        sections.push({ title: currentTitle, lines: [...currentLines] });
        currentLines = [];
      }
      currentTitle = trimmed;
      firstSection = false;
    } else {
      currentLines.push(line);
      if (!isBlank) firstSection = false;
    }

    prevWasBlank = isBlank;
  }

  if (currentLines.some((l) => l.trim())) {
    sections.push({ title: currentTitle, lines: [...currentLines] });
  }

  if (sections.length === 0) {
    return [{ title: defaultTitle, richTextContent: textToTipTapDoc(text) }];
  }

  return sections.map((s) => ({
    title: s.title,
    richTextContent: textToTipTapDoc(s.lines.join("\n")),
  }));
}

/** TipTap JSON for a section that embeds a PDF via iframe. */
export function pdfEmbedContent(blobUrl: string): object {
  return {
    __type: "pdf_embed",
    url: blobUrl,
  };
}
