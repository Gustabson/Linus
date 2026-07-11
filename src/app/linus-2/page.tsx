import type { Metadata } from "next";
import DashboardPage from "@/app/dashboard/page";

export const metadata: Metadata = {
  title: "Linus 2",
};

export default function Linus2Page(props: Parameters<typeof DashboardPage>[0]) {
  return <DashboardPage {...props} />;
}
