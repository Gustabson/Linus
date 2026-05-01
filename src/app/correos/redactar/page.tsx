import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CorreosRedactar } from "@/components/correos/CorreosRedactar";

export const dynamic = "force-dynamic";

export default async function RedactarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return <CorreosRedactar />;
}
