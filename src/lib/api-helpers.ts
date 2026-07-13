import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { slugify } from "./utils";
export { parseBody, safeHttpUrl, safeRemoteImageUrl, safeString } from "./request-validation";

/** Returns the authenticated session, or null if not authenticated. */
export async function getSession() {
  const session = await auth();
  return session?.user?.id ? session : null;
}

/** Returns the tree if it belongs to userId and is not private to others. */
export async function getOwnedTree(slug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, visibility: true, contentType: true },
  });
  if (!tree) return null;
  if (tree.visibility === "PRIVATE" && tree.ownerId !== userId) return null;
  return tree.ownerId === userId ? tree : null;
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

export const unauthorized = () =>
  NextResponse.json({ error: "No autenticado" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Sin permiso" }, { status: 403 });

/** Rejects browser mutations originating on another site (CSRF defense-in-depth). */
export function rejectCrossOrigin(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return forbidden();
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const expectedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (!expectedHost || new URL(origin).host !== expectedHost) return forbidden();
  } catch {
    return forbidden();
  }
  return null;
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
