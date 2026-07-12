import { NextResponse } from "next/server";
import { prisma } from "./prisma";

interface RateLimitOptions {
  action: string;
  userId: string;
  limit: number;
  windowMs: number;
}

/**
 * Enforces a fixed-window limit in Postgres so it also works across serverless
 * instances. Returns a 429 response when blocked, otherwise null.
 */
export async function enforceRateLimit({ action, userId, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const id = `${action}:${userId}:${windowStart}`;

  const counter = await prisma.apiRateLimit.upsert({
    where: { id },
    create: { id, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  // Opportunistic cleanup keeps the table bounded without adding a cron job.
  if (Math.random() < 0.01) {
    await prisma.apiRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  }

  if (counter.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Esperá un momento e intentá nuevamente." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
