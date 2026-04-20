"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  AlignLeft, AlignCenter, Quote, Undo, Redo, Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionEditorProps {
  content: object | null;
  placeholder?: string;
  onChange?: (json: object) => void;
  editable?: boolean;
}

export function SectionEditor({
  content,
  placeholder = "Empezá a escribir aquí...",
  onChange,
  editable = true,
}: SectionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: content ?? "",
    editable,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) return null;

  const toolbarBtn = (active: boolean, onClick: () => void, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-green-100 text-green-800"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 bg-gray-50">
          {toolbarBtn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Negrita", <Bold className="w-4 h-4" />)}
          {toolbarBtn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Cursiva", <Italic className="w-4 h-4" />)}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {toolbarBtn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título 2", <Heading2 className="w-4 h-4" />)}
          {toolbarBtn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Título 3", <Heading3 className="w-4 h-4" />)}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {toolbarBtn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Lista", <List className="w-4 h-4" />)}
          {toolbarBtn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada", <ListOrdered className="w-4 h-4" />)}
          {toolbarBtn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Cita", <Quote className="w-4 h-4" />)}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {toolbarBtn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Izquierda", <AlignLeft className="w-4 h-4" />)}
          {toolbarBtn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Centro", <AlignCenter className="w-4 h-4" />)}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {toolbarBtn(false, () => {
            const url = prompt("URL del enlace:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }, "Enlace", <LinkIcon className="w-4 h-4" />)}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {toolbarBtn(false, () => editor.chain().focus().undo().run(), "Deshacer", <Undo className="w-4 h-4" />)}
          {toolbarBtn(false, () => editor.chain().focus().redo().run(), "Rehacer", <Redo className="w-4 h-4" />)}

          <div className="ml-auto text-xs text-gray-400">
            {editor.storage.characterCount?.characters() ?? 0} caracteres
          </div>
        </div>
      )}
      <div className="p-4">
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}
