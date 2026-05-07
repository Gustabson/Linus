import { auth }        from "@/lib/auth";
import { SocialFeed }  from "@/components/social/SocialFeed";

export const revalidate = 90;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const { tab = "tendencias" } = await searchParams;
  // Both guests and logged-in users see the feed.
  // Guests get read-only mode (no composer, no likes/comments).
  return <SocialFeed userId={session?.user?.id ?? null} tab={tab} />;
}
