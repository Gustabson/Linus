import HomePage from "@/app/page";

export const revalidate = 90;

export default function Linus2FeedPage(props: Parameters<typeof HomePage>[0]) {
  return <HomePage {...props} />;
}
