"use client";

import { RichEditor } from "./RichEditor";

interface SectionEditorProps {
  content:      object | null;
  placeholder?: string;
  onChange?:    (json: object) => void;
  editable?:    boolean;
  pageLayout?:  boolean;
}

export function SectionEditor({
  content,
  placeholder  = "Empezá a escribir aquí...",
  onChange,
  editable     = true,
  pageLayout   = false,
}: SectionEditorProps) {
  return (
    <div className={pageLayout
      ? "overflow-hidden rounded-xl"
      : "border border-border rounded-xl bg-surface overflow-hidden"
    }>
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
        pageLayout={pageLayout}
      />
    </div>
  );
}
