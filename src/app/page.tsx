import { auth }         from "@/lib/auth";
import { LandingPage }  from "@/components/landing/LandingPage";
import { SocialFeed }   from "@/components/social/SocialFeed";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <LandingPage />;

  const { tab = "tendencias" } = await searchParams;
  return <SocialFeed userId={session.user.id} tab={tab} />;
}
