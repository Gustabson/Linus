import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { slugify } from "./utils";

/** Returns the authenticated session, or null if not authenticated. */
export async function getSession() {
  const session = await auth();
  return session?.user?.id ? session : null;
}

/** Returns the tree if it belongs to userId, otherwise null. */
export async function getOwnedTree(slug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  return tree?.ownerId === userId ? tree : null;
}

/** Returns the tree if it's a KERNEL owned by userId, otherwise null. */
export async function getOwnedKernel(slug: string, userId: string) {
  const tree = await prisma.documentTree.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, contentType: true },
  });
  return tree?.ownerId === userId && tree.contentType === "KERNEL" ? tree : null;
}

/**
 * Finds a unique slug by appending -1, -2, … until exists() returns false.
 * @param base    Plain text title — will be slugified internally.
 * @param exists  Async predicate that returns true if the slug is taken.
 *
 * B1: The check + insert is not atomic — two concurrent requests with the
 * same title could both pass exists() and collide on the DB unique constraint.
 * Callers must wrap the insert in a try/catch and retry on unique violation.
 * Example:
 *   for (let attempt = 0; attempt < 5; attempt++) {
 *     const slug = await uniqueSlug(title, exists);
 *     try { return await prisma.documentTree.create({ data: { slug, … } }); }
 *     catch (e) { if (!isUniqueViolation(e)) throw e; }  // retry
 *   }
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
