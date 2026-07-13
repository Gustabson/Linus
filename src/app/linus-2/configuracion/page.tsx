export const dynamic = "force-dynamic";
import ConfiguracionPage from "@/app/configuracion/page";

export default function Linus2ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  return <ConfiguracionPage routePrefix="/linus-2" searchParams={searchParams} />;
}
