/** Parses a bounded JSON object body. Returns null on malformed/oversized input. */
export async function parseBody(req: Request, maxBytes = 1_100_000): Promise<Record<string, unknown> | null> {
  const announcedSize = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(announcedSize) && announcedSize > maxBytes) return null;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/** Trims, returns null if empty, returns null if longer than max. */
export function safeString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

/** Returns a normalized http(s) URL, or null for unsafe/invalid values. */
export function safeHttpUrl(v: unknown, max = 2_048): string | null {
  if (typeof v !== "string" || !v.trim() || v.length > max) return null;
  try {
    const url = new URL(v.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
