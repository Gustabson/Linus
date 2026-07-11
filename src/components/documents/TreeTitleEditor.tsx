"use client";

import { useState, useRef } from "react";
import { useRouter } from "@/hooks/useAppRouter";
import { Pencil, Check, Loader2 } from "lucide-react";

interface Props {
  treeSlug:      string;
  ownerUsername: string;
  docSlug:       string;
  initialTitle:  string;
  isOwner:       boolean;
}

/**
 * Editable h1 for module / resource trees.
 * On submit → PATCH /api/trees/[slug]/settings with { title }.
 * If the slug changes (title was different), redirects to the new URL.
 */
export function TreeTitleEditor({ treeSlug, ownerUsername, docSlug, initialTitle, isOwner }: Props) {
  const router                              = useRouter();
  const [titleValue, setTitleValue]         = useState(initialTitle);
  const [editing,    setEditing]            = useState(false);
  const [saving,     setSaving]             = useState(false);
  const inputRef                            = useRef<HTMLInputElement>(null);

  async function commitTitle() {
    const trimmed = titleValue.trim();
    if (!trimmed) { setTitleValue(initialTitle); setEditing(false); return; }
    if (trimmed === initialTitle) { setEditing(false); return; }

    setSaving(true);
    const res = await fetch(`/api/trees/${treeSlug}/settings`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: trimmed }),
    });
    setSaving(false);

    if (res.ok) {
      const { slug: newSlug } = await res.json();
      setTitleValue(trimmed);
      if (newSlug && newSlug !== treeSlug) {
        router.replace(`/${ownerUsername}/${newSlug}/${docSlug}`);
      }
    } else {
      setTitleValue(initialTitle);
    }
    setEditing(false);
  }

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitTitle(); }
    if (e.key === "Escape") { setTitleValue(titleValue); setEditing(false); }
  }

  if (!isOwner) {
    return <h1 className="text-2xl font-bold text-text">{titleValue}</h1>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleKeyDown}
          className="text-2xl font-bold text-text bg-transparent border-b-2 border-gray-900 focus:outline-none flex-1 min-w-0 pb-0.5 leading-tight"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commitTitle(); }}
          disabled={saving}
          className="shrink-0 p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group cursor-default">
      <h1 className="text-2xl font-bold text-text">{titleValue}</h1>
      <button
        onClick={startEdit}
        title="Renombrar"
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg transition-all"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
