import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  convertInchesToTwip,
} from "docx";

// ── TipTap JSON types ─────────────────────────────────────────────────────────

type TipTapMark = { type: string; attrs?: Record<string, unknown> };
type TipTapNode = {
  type:     string;
  attrs?:   Record<string, unknown>;
  content?: TipTapNode[];
  marks?:   TipTapMark[];
  text?:    string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

type DocxHighlight =
  | "yellow" | "green" | "cyan" | "magenta"
  | "blue"   | "red"   | "lightGray";

const COLOR_TO_HIGHLIGHT: Record<string, DocxHighlight> = {
  "#fef08a": "yellow",
  "#bbf7d0": "green",
  "#bfdbfe": "cyan",
  "#fecdd3": "magenta",
  "#fed7aa": "yellow",
};

// Maps textAlign values to docx alignment string literals
function alignment(attrs: Record<string, unknown> | undefined) {
  switch (attrs?.textAlign) {
    case "center":  return "center"  as const;
    case "right":   return "right"   as const;
    case "justify": return "both"    as const;
    default:        return undefined;
  }
}

// Convert inline TipTap nodes to TextRun / ExternalHyperlink children
function inlineChildren(nodes: TipTapNode[]): (TextRun | ExternalHyperlink)[] {
  return nodes.flatMap((node): (TextRun | ExternalHyperlink)[] => {
    if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (node.type !== "text")     return [];

    const marks     = node.marks ?? [];
    const bold      = marks.some(m => m.type === "bold");
    const italic    = marks.some(m => m.type === "italic");
    const underline = marks.some(m => m.type === "underline");
    const strike    = marks.some(m => m.type === "strike");
    const code      = marks.some(m => m.type === "code");
    const linkMark  = marks.find(m => m.type === "link");
    const hlMark    = marks.find(m => m.type === "highlight");

    const run = new TextRun({
      text:      node.text ?? "",
      bold:      bold      || undefined,
      italics:   italic    || undefined,
      underline: underline ? { type: UnderlineType.SINGLE } : undefined,
      strike:    strike    || undefined,
      font:      code      ? { name: "Courier New" } : undefined,
      size:      code      ? 20 : undefined, // 10pt for inline code
      highlight: hlMark
        ? (COLOR_TO_HIGHLIGHT[String(hlMark.attrs?.color ?? "")] ?? "yellow")
        : undefined,
      color: linkMark ? "1155CC" : undefined,
    });

    if (linkMark) {
      return [new ExternalHyperlink({
        link:     String(linkMark.attrs?.href ?? "#"),
        children: [run],
      })];
    }
    return [run];
  });
}

// Convert a TipTap block node to one or more docx Paragraphs
function blockToParagraphs(node: TipTapNode, listLevel = 0): Paragraph[] {
  switch (node.type) {

    case "paragraph":
      return [new Paragraph({
        children:  inlineChildren(node.content ?? []),
        alignment: alignment(node.attrs),
        spacing:   { after: 120 },
      })];

    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const hMap: Record<number, "Heading1" | "Heading2" | "Heading3"> = {
        1: "Heading1",
        2: "Heading2",
        3: "Heading3",
      };
      return [new Paragraph({
        heading:   hMap[level] ?? "Heading1",
        children:  inlineChildren(node.content ?? []),
        alignment: alignment(node.attrs),
      })];
    }

    case "bulletList":
      return (node.content ?? []).flatMap(item =>
        (item.content ?? []).flatMap(child => {
          if (child.type === "bulletList")  return blockToParagraphs(child, listLevel + 1);
          if (child.type !== "paragraph")   return blockToParagraphs(child, listLevel);
          return [new Paragraph({
            children: inlineChildren(child.content ?? []),
            bullet:   { level: listLevel },
            spacing:  { after: 60 },
          })];
        })
      );

    case "orderedList":
      return (node.content ?? []).flatMap(item =>
        (item.content ?? []).flatMap(child => {
          if (child.type === "orderedList") return blockToParagraphs(child, listLevel + 1);
          if (child.type !== "paragraph")   return blockToParagraphs(child, listLevel);
          return [new Paragraph({
            children:  inlineChildren(child.content ?? []),
            numbering: { reference: "default-numbering", level: listLevel },
            spacing:   { after: 60 },
          })];
        })
      );

    case "blockquote":
      return (node.content ?? []).flatMap(child => {
        if (child.type !== "paragraph") return blockToParagraphs(child);
        return [new Paragraph({
          children:  inlineChildren(child.content ?? []),
          indent:    { left: convertInchesToTwip(0.5) },
          border:    { left: { style: BorderStyle.THICK, size: 12, color: "6366F1" } },
          spacing:   { before: 80, after: 80 },
        })];
      });

    case "codeBlock": {
      const text = (node.content ?? []).map(n => n.text ?? "").join("\n");
      return [new Paragraph({
        children: [new TextRun({ text, font: { name: "Courier New" }, size: 18 })],
        spacing:  { before: 80, after: 80 },
        shading:  { fill: "F3F4F6" },
      })];
    }

    case "horizontalRule":
      return [new Paragraph({
        children: [],
        border:   { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" } },
        spacing:  { before: 160, after: 160 },
      })];

    default:
      return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface DocxSection {
  title:   string;
  content: object | null;
}

export async function exportToDocx(
  sections: DocxSection[],
  docTitle: string,
): Promise<void> {
  const children: Paragraph[] = [
    // Document title
    new Paragraph({
      children:  [new TextRun({ text: docTitle, bold: true, size: 48 })],
      alignment: "center" as const,
      spacing:   { after: 480 },
      border:    { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" } },
    }),
  ];

  for (const section of sections) {
    if (!section.content) continue;
    const tipTap = section.content as { type: string; content?: TipTapNode[] };
    if (tipTap.type !== "doc") continue;

    // Section heading
    children.push(new Paragraph({
      heading:   "Heading2",
      children:  [new TextRun(section.title)],
      alignment: "center" as const,
      spacing:   { before: 360, after: 200 },
    }));

    for (const node of tipTap.content ?? []) {
      children.push(...blockToParagraphs(node));
    }

    // Thin divider between sections
    children.push(new Paragraph({
      children: [],
      border:   { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" } },
      spacing:  { before: 240, after: 240 },
    }));
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [
          {
            level:     0,
            format:    LevelFormat.DECIMAL,
            text:      "%1.",
            alignment: "left" as const,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
          },
          {
            level:     1,
            format:    LevelFormat.DECIMAL,
            text:      "%1.%2.",
            alignment: "left" as const,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.25) } } },
          },
        ],
      }],
    },
    sections: [{
      properties: {
        page: {
          size:   { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
          margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${docTitle.replace(/[^a-z0-9áéíóúüñ\s]/gi, "").trim().replace(/\s+/g, "_") || "documento"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
