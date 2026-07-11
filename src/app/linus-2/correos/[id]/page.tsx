export const dynamic = "force-dynamic";
import CorreoDetallePage from "@/app/correos/[id]/page";

export default function Linus2CorreoDetallePage(props: Parameters<typeof CorreoDetallePage>[0]) {
  return <CorreoDetallePage {...props} routePrefix="/linus-2" />;
}
