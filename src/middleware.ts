import { NextRequest, NextResponse } from "next/server";

/**
 * IP-based sliding-window rate limiter for all API routes.
 *
 * Implementation notes:
 * - Uses module-level Map (works in Next.js Edge Workers which are long-lived,
 *   unlike serverless functions).
 * - Each Edge deployment region has its own store → per-PoP limiting, which
 *   is acceptable for abuse protection.
 * - For strict global rate limiting across regions, swap the store for
 *   Upstash Redis (@upstash/ratelimit) and set UPSTASH_REDIS_REST_URL +
 *   UPSTASH_REDIS_REST_TOKEN in your environment.
 */

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>();

// Clean up expired entries every ~500 requests to avoid unbounded growth
let cleanupCounter = 0;
function maybeCleanup(now: number) {
  if (++cleanupCounter < 500) return;
  cleanupCounter = 0;
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

// ── Rate limit config per route prefix ────────────────────────────────────────
// max: maximum requests allowed in the window
// windowMs: sliding window duration in milliseconds
const LIMITS: Array<{ prefix: string; max: number; windowMs: number }> = [
  // Strict: sending emails — prevent spam
  { prefix: "/api/auth/send-verification", max: 3,  windowMs: 15 * 60_000 },
  // Strict: public search — prevent enumeration / scraping
  { prefix: "/api/users/search",           max: 20, windowMs: 60_000 },
  { prefix: "/api/trees/search",           max: 20, windowMs: 60_000 },
  { prefix: "/api/users/check-username",   max: 20, windowMs: 60_000 },
  // Moderate: file uploads
  { prefix: "/api/upload",                 max: 10, windowMs: 60_000 },
  // Default: all other API routes
  { prefix: "/api",                        max: 60, windowMs: 60_000 },
];

function getLimit(pathname: string) {
  for (const rule of LIMITS) {
    if (pathname.startsWith(rule.prefix)) return rule;
  }
  return LIMITS[LIMITS.length - 1]; // fallback default
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api")) return NextResponse.next();

  // Skip NextAuth internals (callbacks, session, CSRF, providers)
  // send-verification IS included — it's our custom endpoint
  if (
    pathname.startsWith("/api/auth/callback") ||
    pathname === "/api/auth/session" ||
    pathname === "/api/auth/csrf" ||
    pathname === "/api/auth/providers" ||
    pathname === "/api/auth/signout" ||
    pathname === "/api/auth/signin"
  ) {
    return NextResponse.next();
  }

  const ip    = getIp(req);
  const rule  = getLimit(pathname);
  // Key: IP + first 4 path segments (groups e.g. /api/trees/[slug]/*)
  const key   = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const now   = Date.now();

  maybeCleanup(now);

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return NextResponse.next();
  }

  if (entry.count >= rule.max) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intentá de nuevo en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After":       String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(rule.max),
        },
      }
    );
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
