"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { Send, X, BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { ContentType } from "@prisma/client";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { PostData } from "./PostCard";

interface Props {
  currentUser: {
    name:     string | null;
    username: string | null;
    image:    string | null;
  };
  onPostCreated: (post: PostData) => void;
}

interface TreeResult {
  id:          string;
  slug:        string;
  title:       string;
  description: string | null;
  contentType: ContentType;
  forkDepth:   number;
  owner: { username: string | null; name: string | null };
  _count: { likes: number; forks: number };
}

const MAX_CHARS = 2000;

export function PostComposer({ currentUser, onPostCreated }: Props) {
  const [content, setContent]         = useState("");
  const [attachedTree, setAttachedTree] = useState<TreeResult | null>(null);
  const [showTreeSearch, setShowTreeSearch] = useState(false);
  const [treeQuery, setTreeQuery]     = useState("");
  const [treeResults, setTreeResults] = useState<TreeResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [submitting, startSubmit]     = useTransition();
  const [error, setError]             = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount  = content.length;
  const overLimit  = charCount > MAX_CHARS;
  const canSubmit  = content.trim().length > 0 && !overLimit && !submitting;

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }

  async function searchTrees(q: string) {
    setTreeQuery(q);
    if (q.trim().length < 2) { setTreeResults([]); return; }
    setSearching(true);
    try {
      const res  = await fetch(`/api/trees/search?q=${encodeURIComponent(q)}&limit=6&types=KERNEL,MODULE,RESOURCE`);
      const data = await res.json();
      setTreeResults(data.trees ?? []);
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError("");

    startSubmit(async () => {
      const res  = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          content,
          treeId: attachedTree?.id ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al publicar");
        return;
      }

      const post = await res.json();
      onPostCreated(post);
      setContent("");
      setAttachedTree(null);
      setShowTreeSearch(false);
      setTreeQuery("");
      setTreeResults([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {currentUser.image ? (
            <Image
              src={currentUser.image}
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(currentUser.name ?? "?")[0]}
            </div>
          )}
        </div>

        {/* Text area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); autoResize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder="¿Qué querés compartir con la comunidad?"
            rows={2}
            className="w-full resize-none text-[15px] leading-relaxed placeholder:text-text-subtle focus:outline-none text-text"
          />

          {/* Attached tree preview */}
          {attachedTree && (
            <div className="mt-2 border border-border rounded-xl p-3 flex items-start gap-2.5 bg-bg">
              <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {(() => {
                    const badge = CONTENT_TYPE_STYLE[attachedTree.contentType];
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.badgeCls}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm font-semibold text-text line-clamp-1">{attachedTree.title}</p>
                <p className="text-xs text-text-subtle">por {attachedTree.owner.name}</p>
              </div>
              <button
                onClick={() => setAttachedTree(null)}
                className="shrink-0 text-text-subtle hover:text-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* Tree search toggle */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowTreeSearch(!showTreeSearch)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          {attachedTree ? "Cambiar contenido adjunto" : "Adjuntar kernel / módulo / recurso"}
          {showTreeSearch ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTreeSearch && (
          <div className="space-y-2">
            <input
              type="text"
              value={treeQuery}
              onChange={(e) => searchTrees(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
            />
            {searching && (
              <p className="text-xs text-text-subtle flex items-center gap-1.5 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
              </p>
            )}
            {treeResults.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border-subtle">
                {treeResults.map((tree) => {
                  const badge = CONTENT_TYPE_STYLE[tree.contentType];
                  return (
                    <button
                      key={tree.id}
                      type="button"
                      onClick={() => {
                        setAttachedTree(tree);
                        setShowTreeSearch(false);
                        setTreeQuery("");
                        setTreeResults([]);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.badgeCls}`}>
                          {badge.label}
                        </span>
                        <span className="text-sm font-medium text-text truncate">{tree.title}</span>
                        <span className="text-xs text-text-subtle shrink-0">por {tree.owner.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {treeQuery.trim().length >= 2 && !searching && treeResults.length === 0 && (
              <p className="text-xs text-text-subtle px-1">Sin resultados.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer: char count + submit */}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? "text-red-500 font-medium" : "text-text-subtle"}`}>
          {charCount}/{MAX_CHARS}
        </span>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-h disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
              : <><Send className="w-3.5 h-3.5" /> Publicar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
