import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewTreeForm } from "@/components/trees/NewTreeForm";

export default async function NuevoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crear nuevo currículo</h1>
        <p className="text-gray-500 mt-1">
          Tu propio espacio educativo. Podés llenarlo poco a poco.
        </p>
      </div>
      <NewTreeForm />
    </div>
  );
}
