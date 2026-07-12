import Link from "next/link";
import { ArrowUpRight, GitFork } from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import type { SharedTreeData } from "@/lib/comments";

export function SharedTreeCard({
  tree,
  compact = false,
}: {
  tree: SharedTreeData;
  compact?: boolean;
}) {
  const badge = CONTENT_TYPE_STYLE[tree.contentType];
  const href = tree.owner.username ? `/${tree.owner.username}/${tree.slug}` : "#";

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-l-4 border-border bg-gradient-to-r transition-colors ${badge.gradientCls} ${badge.hoverBorderCls} ${compact ? "p-3" : "p-4"}`}
      style={{ borderInlineStartColor: `var(--${tree.contentType.toLowerCase()})` }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-lg ${badge.iconBgCls} ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
          {compact ? badge.icon : badge.iconLg}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.badgeCls}`}>
              {badge.label}
            </span>
            {tree.forkDepth > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-text-subtle">
                <GitFork className="h-3 w-3" /> Fork
              </span>
            )}
          </div>
          <p className={`line-clamp-2 font-bold leading-snug text-text transition-colors ${badge.groupHoverTextCls} ${compact ? "text-sm" : "text-[15px]"}`}>
            {tree.title}
          </p>
          {!compact && tree.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">{tree.description}</p>
          )}
          <p className="mt-1.5 text-[11px] text-text-subtle">
            por {tree.owner.name ?? tree.owner.username ?? "Usuario"} · {tree._count.likes} me gusta · {tree._count.forks} forks
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-primary" />
      </div>
    </Link>
  );
}
