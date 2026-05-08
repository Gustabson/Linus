import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";
import { ThemeProvider }   from "@/components/layout/ThemeProvider";
import { SWRProvider }     from "@/hooks/use-api";
import { cookieToStyle }  from "@/lib/theme-config";
import { ErrorBoundary }  from "@/components/shared/ErrorBoundary";
import { ThemeScript }    from "@/components/layout/ThemeScript";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://eduhub.vercel.app"
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

  // Theme cookie is only applied for logged-in users.
  // Guests always get the default theme — their browser must not inherit
  // another user's saved theme (cookie is per-browser, not per-account).
  let initialTheme: "light" | "dark" = "light";
  let htmlStyle: Record<string, string> = {};

  if (isLoggedIn) {
    try {
      const jar = await cookies();
      const raw = jar.get("eduhub_theme")?.value;
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        const result = cookieToStyle(parsed);
        htmlStyle = result.htmlStyle;
        if (result.isDark) initialTheme = "dark";
      }
    } catch { /* cookie inválida, usar defaults */ }
  }

  return (
    <html lang="es" suppressHydrationWarning className={initialTheme === "dark" ? "dark" : ""} style={htmlStyle as React.CSSProperties}>
      <body className="min-h-screen bg-bg">
        {/* ThemeScript only for logged-in users — guests never read saved theme */}
        {isLoggedIn && <ThemeScript />}
        <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem={false}>
          <SessionProvider session={session}>
            <SWRProvider>
              <LayoutShell isLoggedIn={isLoggedIn}>
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
