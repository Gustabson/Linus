import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewTreeForm } from "@/components/trees/NewTreeForm";

export default async function NuevoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; kernel?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tipo, kernel } = await searchParams;
  const validTypes = ["KERNEL", "MODULE", "RESOURCE"];
  const defaultType = validTypes.includes(tipo ?? "") ? (tipo as "KERNEL" | "MODULE" | "RESOURCE") : "KERNEL";
  const lockType = validTypes.includes(tipo ?? "");

  const LABELS: Record<string, string> = {
    KERNEL: "Crear kernel", MODULE: "Agregar módulo", RESOURCE: "Agregar recurso",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{LABELS[defaultType] ?? "Crear nuevo"}</h1>
        <p className="text-gray-500 mt-1">
          {defaultType === "MODULE"
            ? "Un módulo es una unidad didáctica completa con secciones, igual que un kernel."
            : defaultType === "RESOURCE"
            ? "Un recurso es material de apoyo educativo con su propio editor."
            : "Tu propio espacio educativo. Podés llenarlo poco a poco."}
        </p>
      </div>
      <NewTreeForm defaultType={defaultType} lockType={lockType} kernelSlug={kernel} />
    </div>
  );
}
