import { Linus2Shell } from "@/components/linus2/Linus2Shell";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function Linus2Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  const session = await auth();

  return (
    <Linus2Shell
      userName={session?.user?.name ?? null}
      username={session?.user?.username ?? null}
    >
      {children}
    </Linus2Shell>
  );
}
