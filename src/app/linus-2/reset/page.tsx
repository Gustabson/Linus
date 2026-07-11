import ResetPage from "@/app/reset/page";

export const dynamic = "force-dynamic";

export default async function Linus2ResetPage() {
  await ResetPage({ routePrefix: "/linus-2" });
  return null;
}
