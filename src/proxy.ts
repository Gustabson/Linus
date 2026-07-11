import { NextRequest, NextResponse } from "next/server";

/**
 * Per-instance IP fixed-window limiter. It is intentionally a lightweight
 * abuse guard; deployments that need a strict global quota should replace
 * this store with a shared backend such as Redis.
 */
interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>();
let cleanupCounter = 0;

function maybeCleanup(now: number) {
  if (++cleanupCounter < 500) return;
  cleanupCounter = 0;
  for (const [key, value] of store) {
    if (value.resetAt < now) store.delete(key);
  }
  if (store.size > 10_000) {
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++removed >= 1_000) break;
    }
  }
}

const LIMITS: Array<{ prefix: string; max: number; windowMs: number }> = [
  { prefix: "/api/auth/send-verification", max: 3,  windowMs: 15 * 60_000 },
  { prefix: "/api/users/search",           max: 20, windowMs: 60_000 },
  { prefix: "/api/trees/search",           max: 20, windowMs: 60_000 },
  { prefix: "/api/users/check-username",   max: 20, windowMs: 60_000 },
  { prefix: "/api/upload",                 max: 10, windowMs: 60_000 },
  { prefix: "/api",                        max: 60, windowMs: 60_000 },
];

function getLimit(pathname: string) {
  if (pathname.endsWith("/import")) return { prefix: "/api/trees/*/import", max: 10, windowMs: 60_000 };
  return LIMITS.find((rule) => pathname.startsWith(rule.prefix)) ?? LIMITS[LIMITS.length - 1];
}

function getIp(req: NextRequest): string {
  const candidate = (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  ).slice(0, 64);
  return /^[0-9a-f:.]+$/i.test(candidate) ? candidate : "unknown";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api")) return NextResponse.next();

  if (
    pathname.startsWith("/api/auth/callback") ||
    pathname === "/api/auth/session" ||
    pathname === "/api/auth/csrf" ||
    pathname === "/api/auth/providers" ||
    pathname === "/api/auth/signout" ||
    pathname === "/api/auth/signin"
  ) return NextResponse.next();

  const ip = getIp(req);
  const rule = getLimit(pathname);
  const routeBucket = pathname.endsWith("/import")
    ? "/api/trees/import"
    : pathname.split("/").slice(0, 4).join("/");
  const key = `${ip}:${routeBucket}`;
  const now = Date.now();
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
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(rule.max),
        },
      },
    );
  }
  entry.count++;
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
