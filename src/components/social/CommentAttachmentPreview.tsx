import Image from "next/image";
import { Download, FileText, Film, ImageIcon } from "lucide-react";
import type { CommentAttachment } from "@/lib/comments";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CommentAttachmentPreview({ attachment }: { attachment: CommentAttachment }) {
  if (attachment.type.startsWith("image/")) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block max-w-md overflow-hidden rounded-xl border border-border-subtle bg-surface"
        aria-label={`Abrir ${attachment.name}`}
      >
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={720}
          height={480}
          unoptimized
          className="max-h-80 w-full object-contain"
        />
        <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-surface/90 px-2 py-1 text-[11px] text-text shadow-sm backdrop-blur">
          <ImageIcon className="h-3 w-3 text-primary" /> {attachment.name}
        </span>
      </a>
    );
  }

  if (attachment.type.startsWith("video/")) {
    return (
      <div className="max-w-md overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <video controls preload="metadata" className="max-h-80 w-full bg-black">
          <source src={attachment.url} type={attachment.type} />
        </video>
        <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-text-muted">
          <Film className="h-3.5 w-3.5 text-primary" /> {attachment.name} · {formatSize(attachment.size)}
        </p>
      </div>
    );
  }

  const isPdf = attachment.type === "application/pdf";
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/30"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">{attachment.name}</span>
        <span className="block text-[11px] text-text-subtle">
          {isPdf ? "Documento PDF" : "Documento de Word"} · {formatSize(attachment.size)}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-primary" />
    </a>
  );
}
