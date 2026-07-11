export const dynamic = "force-dynamic";
import TreeSettingsPage from "@/app/[username]/[slug]/configuracion/page";

export default function Linus2TreeSettingsPage(props: Parameters<typeof TreeSettingsPage>[0]) {
  return <TreeSettingsPage {...props} routePrefix="/linus-2" />;
}
