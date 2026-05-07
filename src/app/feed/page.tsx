import { auth }       from "@/lib/auth";
import { SocialFeed } from "@/components/social/SocialFeed";
import { redirect }   from "next/navigation";

export const revalidate = 90;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();

  // Logged-in users don't need the public feed — send them home
  if (session?.user?.id) redirect("/");

  const { tab = "tendencias" } = await searchParams;
  return <SocialFeed userId={null} tab={tab} />;
}
