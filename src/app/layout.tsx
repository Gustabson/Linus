import type { Metadata } from "next";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";
import { ThemeProvider }   from "@/components/layout/ThemeProvider";

export const dynamic = "force-dynamic";

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

  // Load user theme server-side → apply before paint, no flash
  let initialTheme: "light" | "dark" = "light";
  let customVars: Record<string, string> | undefined;

  if (session?.user?.id) {
    const prefs = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        themeMode: true, themeBg: true, themeSurface: true,
        themeBorder: true, themeText: true, themePrimary: true,
      },
    });

    if (prefs?.themeMode === "dark") {
      initialTheme = "dark";
    } else if (prefs?.themeMode === "custom") {
      // Build CSS variable map — applied as inline style on <html>
      customVars = {
        ...(prefs.themeBg      ? { "--bg": prefs.themeBg }                                           : {}),
        ...(prefs.themeSurface ? { "--surface": prefs.themeSurface }                                 : {}),
        ...(prefs.themeBorder  ? { "--border": prefs.themeBorder, "--border-subtle": prefs.themeBorder } : {}),
        ...(prefs.themeText    ? {
          "--text":         prefs.themeText,
          "--text-muted":   prefs.themeText + "cc",
          "--text-subtle":  prefs.themeText + "88",
        } : {}),
        ...(prefs.themePrimary ? { "--primary": prefs.themePrimary, "--primary-h": prefs.themePrimary } : {}),
      };
    }
  }

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={initialTheme === "dark" ? "dark" : ""}
      style={customVars as React.CSSProperties}
    >
      <body className="min-h-screen bg-bg">
        <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem={false}>
          <SessionProvider session={session}>
            <LayoutShell isLoggedIn={isLoggedIn}>
              {children}
            </LayoutShell>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
