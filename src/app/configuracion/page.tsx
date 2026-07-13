import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ExternalLink, Palette, ShieldCheck, UserRound } from "lucide-react";
import { ConfigApariencia } from "@/components/configuracion/ConfigApariencia";
import { ConfigCuenta } from "@/components/configuracion/ConfigCuenta";
import { ConfigNotificaciones } from "@/components/configuracion/ConfigNotificaciones";
import { ConfigPerfil } from "@/components/configuracion/ConfigPerfil";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRESET_LIGHT } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

type SettingsSection = "perfil" | "cuenta" | "apariencia" | "notificaciones";

const SETTINGS_SECTIONS = [
  { key: "perfil", label: "Perfil público", description: "Tu identidad en la comunidad", icon: UserRound },
  { key: "cuenta", label: "Cuenta", description: "Acceso y seguridad", icon: ShieldCheck },
  { key: "apariencia", label: "Apariencia", description: "Tema y colores", icon: Palette },
  { key: "notificaciones", label: "Notificaciones", description: "Preferencias de email", icon: Bell },
] as const;

export default async function ConfiguracionPage({
  routePrefix = "",
  searchParams = Promise.resolve({}),
}: {
  routePrefix?: string;
  searchParams?: Promise<{ seccion?: string }>;
} = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`${routePrefix}/login`);

  const { seccion } = await searchParams;
  const activeSection = (SETTINGS_SECTIONS.some((item) => item.key === seccion) ? seccion : "cuenta") as SettingsSection;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      image: true,
      bio: true,
      website: true,
      location: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      themeMode: true,
      themeBg: true,
      themeSurface: true,
      themeBorder: true,
      themeText: true,
      themePrimary: true,
      themeSidebarBg: true,
      themeSidebarText: true,
      themeKernel: true,
      themeModule: true,
      themeResource: true,
      notifCorreos: true,
      notifComentarios: true,
      notifLikes: true,
      notifSeguidores: true,
      notifPropuestas: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) redirect(`${routePrefix}/login`);

  const providers = [...new Set(user.accounts.map((account) => account.provider))];
  const themeMode = (user.themeMode ?? "light") as "light" | "dark" | "custom";
  const themeColors = {
    themeBg: user.themeBg ?? PRESET_LIGHT.themeBg,
    themeSurface: user.themeSurface ?? PRESET_LIGHT.themeSurface,
    themeBorder: user.themeBorder ?? PRESET_LIGHT.themeBorder,
    themeText: user.themeText ?? PRESET_LIGHT.themeText,
    themePrimary: user.themePrimary ?? PRESET_LIGHT.themePrimary,
  };
  const profilePath = `${routePrefix}/${user.username ?? session.user.id}`;
  const settingsHref = (section: SettingsSection) => `${routePrefix}/configuracion?seccion=${section}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1 py-4 sm:px-4 sm:py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Preferencias</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text">Configuración</h1>
          <p className="mt-1 text-sm text-text-muted">Gestioná tu identidad, cuenta y experiencia en LINUG.</p>
        </div>
        <Link href={profilePath} className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary">
          {user.image ? (
            <Image src={user.image} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{(user.name ?? user.username ?? "?")[0].toUpperCase()}</span>
          )}
          Ver perfil <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </header>

      <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5 shadow-sm md:hidden">
        {SETTINGS_SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = activeSection === key;
          return (
            <Link key={key} href={settingsHref(key)} aria-current={active ? "page" : undefined} className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-text"}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="grid items-start gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="sticky top-4 hidden rounded-2xl border border-border bg-surface p-2 shadow-sm md:block">
          <nav aria-label="Secciones de configuración" className="space-y-1">
            {SETTINGS_SECTIONS.map(({ key, label, description, icon: Icon }) => {
              const active = activeSection === key;
              return (
                <Link key={key} href={settingsHref(key)} aria-current={active ? "page" : undefined} className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg hover:text-text"}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{label}</span>
                    <span className={`mt-0.5 block text-[11px] leading-snug ${active ? "text-primary/75" : "text-text-subtle"}`}>{description}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          {activeSection === "perfil" && (
            <ConfigPerfil initial={{
              name: user.name,
              username: user.username,
              bio: user.bio,
              website: user.website,
              location: user.location,
            }} />
          )}
          {activeSection === "cuenta" && (
            <ConfigCuenta
              email={user.email}
              emailVerified={user.emailVerified?.toISOString() ?? null}
              providers={providers}
              createdAt={user.createdAt.toISOString()}
            />
          )}
          {activeSection === "apariencia" && (
            <ConfigApariencia
              initialMode={themeMode}
              initialColors={themeColors}
              initialSidebarColors={{
                themeSidebarBg: user.themeSidebarBg ?? "",
                themeSidebarText: user.themeSidebarText ?? "#ffffff",
              }}
              initialContentColors={{
                themeKernel: user.themeKernel ?? "#15803d",
                themeModule: user.themeModule ?? "#1d4ed8",
                themeResource: user.themeResource ?? "#b45309",
              }}
            />
          )}
          {activeSection === "notificaciones" && (
            <ConfigNotificaciones initial={{
              notifCorreos: user.notifCorreos,
              notifComentarios: user.notifComentarios,
              notifLikes: user.notifLikes,
              notifSeguidores: user.notifSeguidores,
              notifPropuestas: user.notifPropuestas,
            }} />
          )}
        </main>
      </div>
    </div>
  );
}
