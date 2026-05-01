import type { Metadata } from "next";
import "./globals.css";
import { auth }            from "@/lib/auth";
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

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-bg">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
