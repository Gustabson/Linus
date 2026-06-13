import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";
import { ThemeProvider }   from "@/components/layout/ThemeProvider";
import { SWRProvider }     from "@/hooks/use-api";
import { buildThemeCookie, cookieToStyle } from "@/lib/theme-config";
import { ErrorBoundary }  from "@/components/shared/ErrorBoundary";
import { ThemeScript }    from "@/components/layout/ThemeScript";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://linus-jet.vercel.app"
  ),
  title: {
    default:  "EduHub — Conocimiento Educativo Abierto",
    template: "%s · EduHub",
  },
  description:
    "Plataforma colaborativa de recursos educativos. Forkea, adapta y compartí currículos con personas de todo el mundo.",
  openGraph: { siteName: "EduHub", locale: "es_AR", type: "website" },
  twitter: { card: "summary" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session    = await auth();
  const isLoggedIn = !!session?.user?.id;

  // Theme is account-scoped. Guests always get the default light theme.
  // For logged-in users: fast path reads the cookie; if missing (first login
  // or cleared on logout), falls back to DB so the theme applies immediately
  // without requiring the user to re-save settings.
  let initialTheme: "light" | "dark" = "light";
  let htmlStyle:    Record<string, string> = {};
  // Cookie value to pass to the client so it persists it for future page loads
  // (Server Components cannot call cookies().set, so the client does it once).
  let cookieToHydrate: string | null = null;

  if (isLoggedIn) {
    try {
      const jar = await cookies();
      const themeCookies = jar.getAll("eduhub_theme");
      const raw = themeCookies.at(-1)?.value;

      if (raw) {
        // ── Fast path: cookie already present ─────────────────────────
        const parsed = JSON.parse(decodeURIComponent(raw));
        const result = cookieToStyle(parsed);
        htmlStyle    = result.htmlStyle;
        if (result.isDark) initialTheme = "dark";
      } else {
        // ── Slow path: first login or cookie was cleared ───────────────
        // Load from DB so the theme applies without a manual re-save.
        const user = await prisma.user.findUnique({
          where:  { id: session!.user.id },
          select: {
            themeMode: true,
            themeBg: true, themeSurface: true, themeBorder: true,
            themeText: true, themePrimary: true,
            themeSidebarBg: true, themeSidebarText: true,
            themeKernel: true, themeModule: true, themeResource: true,
          },
        });

        if (user) {
          const payload = buildThemeCookie({
            themeBg:          user.themeBg          ?? "",
            themeSurface:     user.themeSurface     ?? "",
            themeBorder:      user.themeBorder      ?? "",
            themeText:        user.themeText        ?? "",
            themePrimary:     user.themePrimary     ?? "",
            themeSidebarBg:   user.themeSidebarBg   ?? "",
            themeSidebarText: user.themeSidebarText ?? "",
            themeKernel:      user.themeKernel      ?? "",
            themeModule:      user.themeModule      ?? "",
            themeResource:    user.themeResource    ?? "",
          });
          if (user.themeMode) payload.mode = user.themeMode;

          const result = cookieToStyle(payload);
          htmlStyle    = result.htmlStyle;
          if (result.isDark) initialTheme = "dark";

          // Pass to LayoutShell — client will persist this as the cookie.
          cookieToHydrate = encodeURIComponent(JSON.stringify(payload));
        }
      }
    } catch { /* DB/cookie error — use defaults */ }
  }

  return (
    <html lang="es" suppressHydrationWarning className={initialTheme === "dark" ? "dark" : ""} style={htmlStyle as React.CSSProperties}>
      <body className="min-h-screen bg-bg">
        {/* ThemeScript only for logged-in users — guests never read saved theme */}
        {isLoggedIn && <ThemeScript />}
        <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem={false}>
          <SessionProvider session={session}>
            <SWRProvider>
              <LayoutShell isLoggedIn={isLoggedIn} cookieToHydrate={cookieToHydrate}>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </LayoutShell>
              <Toaster />
            </SWRProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
