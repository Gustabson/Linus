import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { slugify } from "./utils";

/** Returns the authenticated session, or null if not authenticated. */
export async function getSession() {
  const session = await auth();
  return session?.user?.id ? session : null;
}

/** Returns the tree if it belongs to userId and is not private to others. */
export async function getOwnedTree(slug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, visibility: true },
  });
  if (!tree) return null;
  if (tree.visibility === "PRIVATE" && tree.ownerId !== userId) return null;
  return tree.ownerId === userId ? tree : null;
}

/** Returns the tree if it's a KERNEL owned by userId, otherwise null. */
export async function getOwnedKernel(slug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, contentType: true, visibility: true },
  });
  if (!tree) return null;
  if (tree.visibility === "PRIVATE" && tree.ownerId !== userId) return null;
  return tree?.ownerId === userId && tree.contentType === "KERNEL" ? tree : null;
}

/**
 * Genera un slug único agregando -1, -2, … hasta que exists() devuelva false.
 *
 * Ojo: check + insert no es atómico. Los callers deben envolver el insert en
 * try/catch y reintentar con isUniqueViolation(err) (ver trees/route.ts).
 */
export async function uniqueSlug(
  base: string,
  exists: (s: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let i = 0;
  while (await exists(slug)) slug = `${root}-${++i}`;
  return slug;
}

/** Returns true if the error is a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

/** Parses the JSON body of a request. Returns null on malformed JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseBody(req: Request): Promise<Record<string, any> | null> {
  return req.json().catch(() => null);
}

export const unauthorized = () =>
  NextResponse.json({ error: "No autenticado" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Sin permiso" }, { status: 403 });

/** Trims, returns null if empty, returns null if longer than max. */
export function safeString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

/** Escapes HTML special chars — use before interpolating user content into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Auth wrapper (DRY — replaces 37 manual getSession+unauthorized calls) ──
type AuthHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
  session: { user: { id: string; name?: string | null; username?: string | null; role?: string } }
) => Promise<Response>;

export function withAuth(handler: AuthHandler) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getSession();
    if (!session) return unauthorized();
    try {
      return await handler(req, ctx, session);
    } catch (err) {
      console.error("API error:", err);
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  };
}
