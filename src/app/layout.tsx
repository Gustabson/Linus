import type { Metadata } from "next";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";
import { ThemeProvider }   from "@/components/layout/ThemeProvider";
import { buildCustomThemeCSS } from "@/lib/theme";

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
  openGraph: {
    siteName: "EduHub",
    locale:   "es_AR",
    type:     "website",
  },
  twitter: { card: "summary" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session    = await auth();
  const isLoggedIn = !!session?.user?.id;

  // Load custom theme server-side to inject before paint (no flash)
  let customCSS   = "";
  let initialTheme: "light" | "dark" = "light";

  if (session?.user?.id) {
    const prefs = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        themeMode:    true,
        themeBg:      true,
        themeSurface: true,
        themeBorder:  true,
        themeText:    true,
        themePrimary: true,
      },
    });

    if (prefs?.themeMode === "dark") {
      initialTheme = "dark";
    } else if (prefs?.themeMode === "custom") {
      customCSS = buildCustomThemeCSS({
        themeBg:      prefs.themeBg      ?? undefined,
        themeSurface: prefs.themeSurface ?? undefined,
        themeBorder:  prefs.themeBorder  ?? undefined,
        themeText:    prefs.themeText    ?? undefined,
        themePrimary: prefs.themePrimary ?? undefined,
      });
    }
  }

  return (
    <html lang="es" suppressHydrationWarning className={initialTheme === "dark" ? "dark" : ""}>
      <head>
        {customCSS && (
          <style dangerouslySetInnerHTML={{ __html: customCSS }} />
        )}
      </head>
      <body className="min-h-screen bg-bg">
        <ThemeProvider
          attribute="class"
          defaultTheme={initialTheme}
          enableSystem={false}
          // In custom mode, next-themes doesn't manage the theme
          forcedTheme={customCSS ? "light" : undefined}
        >
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
