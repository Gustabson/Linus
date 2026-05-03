"use client";

import { RichEditor } from "./RichEditor";

interface SectionEditorProps {
  content:      object | null;
  placeholder?: string;
  onChange?:    (json: object) => void;
  editable?:    boolean;
}

export function SectionEditor({
  content,
  placeholder = "Empezá a escribir aquí...",
  onChange,
  editable = true,
}: SectionEditorProps) {
  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <RichEditor
        initialContentJson={content}
        onChangeJson={onChange}
        placeholder={placeholder}
        editable={editable}
        minHeight="150px"
        showStrike
        showCode
        showUndoRedo
        showCharCount
      />
    </div>
  );
}
