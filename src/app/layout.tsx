import type { Metadata } from "next";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";

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
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider session={session}>
          <LayoutShell isLoggedIn={isLoggedIn}>
            {children}
          </LayoutShell>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
