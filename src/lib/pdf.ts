export function getSafePdfUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
