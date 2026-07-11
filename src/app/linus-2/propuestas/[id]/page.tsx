export const dynamic = "force-dynamic";
import ProposalDetailPage from "@/app/propuestas/[id]/page";

export default function Linus2ProposalDetailPage(props: Parameters<typeof ProposalDetailPage>[0]) {
  return <ProposalDetailPage {...props} routePrefix="/linus-2" />;
}
