import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/Toaster";
import { SessionProvider } from "@/components/layout/SessionProvider";

export const metadata: Metadata = {
  title: "EduHub — Conocimiento Educativo Abierto",
  description:
    "Plataforma colaborativa de recursos educativos. Forkea, adapta y comparte curriculos con maestros de todo el mundo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
