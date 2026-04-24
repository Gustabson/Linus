"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitFork, Heart, ChevronDown, ChevronRight, Cpu } from "lucide-react";

interface ForkNode {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  forkDepth: number;
  owner: { name: string | null; username: string | null; image: string | null };
  _count: { forks: number; likes: number };
  forks: ForkNode[];
}

function TreeNode({
  node,
  currentSlug,
  depth = 0,
}: {
  node: ForkNode;
  currentSlug: string;
  depth?: number;
}) {
  const isCurrent = node.slug === currentSlug;
  const hasChildren = node.forks.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div className="relative">
      {/* Connector line from parent */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" style={{ left: -17 }} />
      )}

      <div className={`flex items-start gap-2 group ${depth > 0 ? "ml-6" : ""}`}>
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 mt-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Node card */}
        <Link
          href={`/t/${node.slug}`}
          className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left mb-1 ${
            isCurrent
              ? "border-green-400 bg-green-50 shadow-sm"
              : "border-gray-200 bg-white hover:border-green-300 hover:shadow-sm"
          }`}
        >
          {/* Avatar */}
          {node.owner.image ? (
            <Image src={node.owner.image} alt="" width={24} height={24} className="rounded-full shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0">
              {(node.owner.name ?? "?")[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {node.contentType === "KERNEL" && (
                <Cpu className="w-3 h-3 text-green-600 shrink-0" />
              )}
              <span className={`text-sm font-medium truncate ${isCurrent ? "text-green-800" : "text-gray-900"}`}>
                {node.title}
              </span>
              {isCurrent && (
                <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full shrink-0">
                  acá estás
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">
              {node.owner.username ? `@${node.owner.username}` : node.owner.name}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {node._count.likes}
            </span>
            <span className="flex items-center gap-0.5">
              <GitFork className="w-3 h-3" /> {node._count.forks}
            </span>
          </div>
        </Link>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-6 relative">
          <div className="absolute left-0 top-0 bottom-4 w-px bg-gray-200" style={{ left: -11 }} />
          {node.forks.map((fork) => (
            <TreeNode key={fork.id} node={fork} currentSlug={currentSlug} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ForkTree({
  root,
  currentSlug,
  ancestors,
}: {
  root: ForkNode;
  currentSlug: string;
  ancestors: ForkNode[];
}) {
  const [open, setOpen] = useState(false);

  const totalForks = countForks(root);

  function countForks(node: ForkNode): number {
    return node.forks.reduce((acc, f) => acc + 1 + countForks(f), 0);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-gray-400" />
          <span className="font-semibold text-gray-900">Árbol de forks</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {totalForks} fork{totalForks !== 1 ? "s" : ""}
          </span>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-1">
          {/* Ancestor path */}
          {ancestors.length > 0 && (
            <div className="mb-3 space-y-1">
              {ancestors.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2" style={{ paddingLeft: i * 24 }}>
                  {i > 0 && <GitFork className="w-3 h-3 text-gray-300 shrink-0" />}
                  <Link
                    href={`/t/${a.slug}`}
                    className="text-xs text-gray-500 hover:text-green-700 flex items-center gap-1"
                  >
                    {a.contentType === "KERNEL" && <Cpu className="w-3 h-3 text-green-600" />}
                    {a.title}
                  </Link>
                </div>
              ))}
              <div className="border-l-2 border-dashed border-gray-200 ml-3 h-4" />
            </div>
          )}

          <TreeNode node={root} currentSlug={currentSlug} depth={0} />
        </div>
      )}
    </div>
  );
}
