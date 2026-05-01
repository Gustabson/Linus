import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/prisma";
import { redirect }     from "next/navigation";
import { ConfigPerfil }         from "@/components/configuracion/ConfigPerfil";
import { ConfigCuenta }         from "@/components/configuracion/ConfigCuenta";
import { ConfigApariencia }     from "@/components/configuracion/ConfigApariencia";
import { ConfigNotificaciones } from "@/components/configuracion/ConfigNotificaciones";
import { PRESET_LIGHT }         from "@/lib/theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      name:          true,
      username:      true,
      email:         true,
      emailVerified: true,
      image:         true,
      bio:           true,
      website:       true,
      location:      true,
      createdAt:     true,
      themeMode:     true,
      themeBg:       true,
      themeSurface:  true,
      themeBorder:   true,
      themeText:     true,
      themePrimary:  true,
      themeKernel:   true,
      themeModule:   true,
      themeResource: true,
      notifCorreos:     true,
      notifComentarios: true,
      notifLikes:       true,
      notifSeguidores:  true,
      notifPropuestas:  true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/login");

  const providers = [...new Set(user.accounts.map((a) => a.provider))];

  const themeMode = (user.themeMode ?? "light") as "light" | "dark" | "custom";
  const themeColors = {
    themeBg:      user.themeBg      ?? PRESET_LIGHT.themeBg,
    themeSurface: user.themeSurface ?? PRESET_LIGHT.themeSurface,
    themeBorder:  user.themeBorder  ?? PRESET_LIGHT.themeBorder,
    themeText:    user.themeText    ?? PRESET_LIGHT.themeText,
    themePrimary: user.themePrimary ?? PRESET_LIGHT.themePrimary,
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

      <div className="pb-2">
        <h1 className="text-2xl font-bold text-text">Configuración</h1>
        <p className="text-sm text-text-muted mt-1">Gestioná tu perfil, cuenta y preferencias.</p>
      </div>

      <ConfigPerfil
        initial={{
          name:     user.name,
          username: user.username,
          bio:      user.bio,
          website:  user.website,
          location: user.location,
        }}
      />

      <ConfigCuenta
        email={user.email}
        emailVerified={user.emailVerified?.toISOString() ?? null}
        providers={providers}
        createdAt={user.createdAt.toISOString()}
      />

      <ConfigApariencia
        initialMode={themeMode}
        initialColors={themeColors}
        initialContentColors={{
          themeKernel:   user.themeKernel   ?? "#15803d",
          themeModule:   user.themeModule   ?? "#1d4ed8",
          themeResource: user.themeResource ?? "#b45309",
        }}
      />

      <ConfigNotificaciones
        initial={{
          notifCorreos:     user.notifCorreos,
          notifComentarios: user.notifComentarios,
          notifLikes:       user.notifLikes,
          notifSeguidores:  user.notifSeguidores,
          notifPropuestas:  user.notifPropuestas,
        }}
      />

    </div>
  );
}
