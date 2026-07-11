import TreePage from "@/app/[username]/[slug]/page";

export default function Linus2TreePage(props: Parameters<typeof TreePage>[0]) {
  return <TreePage {...props} routePrefix="/linus-2" />;
}
