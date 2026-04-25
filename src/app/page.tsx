import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { SocialFeed } from "@/components/social/SocialFeed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) return <SocialFeed userId={session.user.id} />;
  return <LandingPage />;
}
