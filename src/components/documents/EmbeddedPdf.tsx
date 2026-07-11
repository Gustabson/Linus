import { getSafePdfUrl } from "@/lib/pdf";
export { getSafePdfUrl } from "@/lib/pdf";

export function EmbeddedPdf({ url, title, className = "w-full rounded-lg border border-border" }: {
  url: unknown;
  title: string;
  className?: string;
}) {
  const safeUrl = getSafePdfUrl(url);
  if (!safeUrl) {
    return <p className="py-8 text-center text-sm text-text-subtle">El PDF incrustado no tiene una URL válida.</p>;
  }
  return (
    <iframe
      src={safeUrl}
      className={className}
      style={{ height: "600px" }}
      title={title}
      sandbox="allow-same-origin allow-downloads"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
