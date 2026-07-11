"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { EmbeddedPdf } from "./EmbeddedPdf";

export function PreviewContent({ content }: { content: object | null }) {
  const embedded = content as Record<string, unknown> | null;
  if (embedded?.__type === "pdf_embed")
    return <EmbeddedPdf url={embedded.url} title="PDF incrustado" />;

  return <TiptapPreview content={content} />;
}

function TiptapPreview({ content }: { content: object | null }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: true }),
    ],
    content: content ?? "",
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="prose prose-sm prose-green max-w-none">
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}
