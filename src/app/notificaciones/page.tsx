import { auth }          from "@/lib/auth";
import { LoginRequired } from "@/components/shared/LoginRequired";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const session = await auth();
  if (!session?.user?.id) return <LoginRequired feature="las notificaciones" />;
  return <NotificationsClient />;
}
