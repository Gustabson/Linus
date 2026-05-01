import { auth }     from "@/lib/auth";
import { prisma }   from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      themeMode:    "light",
      themeBg:      null,
      themeSurface: null,
      themeBorder:  null,
      themeText:    null,
      themePrimary: null,
    },
  });

  redirect("/configuracion");
}
