import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default async function KernelPage() {
  const kernel = await prisma.documentTree.findFirst({
    where: { isKernel: true },
    select: { slug: true },
  });

  if (!kernel) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">El kernel no existe aún</h1>
        <p className="text-gray-500">Pronto el currículo base estará disponible.</p>
      </div>
    );
  }

  redirect(`/t/${kernel.slug}`);
}
