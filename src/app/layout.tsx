import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { auth }            from "@/lib/auth";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LayoutShell }     from "@/components/layout/LayoutShell";
import { Toaster }         from "@/components/ui/Toaster";
import { ThemeProvider }   from "@/components/layout/ThemeProvider";
import { SWRProvider }     from "@/hooks/use-api";

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

// ── Leer tema de cookie (server-side, antes del paint, sin DB) ────────────
interface ThemeCookie {
  mode?: string;
  bg?: string; surface?: string; border?: string;
  text?: string; primary?: string;
  sidebarBg?: string; sidebarText?: string;
  kernel?: string; module?: string; resource?: string;
}

async function readThemeCookie(): Promise<{ initialTheme: "light" | "dark"; htmlStyle: Record<string, string> }> {
  const style: Record<string, string> = {};
  let initialTheme: "light" | "dark" = "light";

  try {
    const jar = await cookies();
    const raw = jar.get("eduhub_theme")?.value;
    if (!raw) return { initialTheme, htmlStyle: style };

    const t: ThemeCookie = JSON.parse(decodeURIComponent(raw));

    if (t.mode === "dark") initialTheme = "dark";

    if (t.bg)      style["--bg"] = t.bg;
    if (t.surface) style["--surface"] = t.surface;
    if (t.border)  { style["--border"] = t.border; style["--border-subtle"] = t.border; }
    if (t.text)    {
      style["--text"] = t.text;
      style["--text-muted"] = t.text + "cc";
      style["--text-subtle"] = t.text + "88";
    }
    if (t.primary) { style["--primary"] = t.primary; style["--primary-h"] = t.primary; }
    if (t.sidebarBg)   style["--sidebar-bg"] = t.sidebarBg;
    if (t.sidebarText) style["--sidebar-text"] = t.sidebarText;
    if (t.kernel)   { style["--kernel"] = t.kernel;     style["--kernel-h"] = t.kernel; }
    if (t.module)   { style["--module"] = t.module;     style["--module-h"] = t.module; }
    if (t.resource) { style["--resource"] = t.resource; style["--resource-h"] = t.resource; }
  } catch { /* cookie inválida */ }

  return { initialTheme, htmlStyle: style };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session    = await auth();
  const isLoggedIn = !!session?.user?.id;
  const { initialTheme, htmlStyle } = await readThemeCookie();

  return (
    <html lang="es" suppressHydrationWarning className={initialTheme === "dark" ? "dark" : ""} style={htmlStyle as React.CSSProperties}>
      <body className="min-h-screen bg-bg">
        <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem={false}>
          <SessionProvider session={session}>
            <SWRProvider>
              <LayoutShell isLoggedIn={isLoggedIn}>
                {children}
              </LayoutShell>
              <Toaster />
            </SWRProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
