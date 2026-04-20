import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GitFork, BookOpen, Plus, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const myTrees = await prisma.documentTree.findMany({
    where: { ownerId: session.user.id },
    include: {
      parentTree: { select: { slug: true, title: true } },
      _count: { select: { forks: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Tus currículos educativos</p>
        </div>
        <Link
          href="/nuevo"
          className="bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo currículo
        </Link>
      </div>

      {/* Trees */}
      {myTrees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <GitFork className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="font-medium text-gray-900 mb-1">Todavía no tenés currículos</h3>
          <p className="text-gray-500 text-sm mb-4">
            Explorá el kernel y forkealo, o creá uno desde cero.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/kernel" className="text-sm text-green-700 hover:underline">
              Ver el kernel
            </Link>
            <Link
              href="/nuevo"
              className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800"
            >
              Crear nuevo
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myTrees.map((tree) => (
            <Link
              key={tree.id}
              href={`/t/${tree.slug}`}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  {tree.isKernel && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium mr-2">
                      Kernel
                    </span>
                  )}
                  {tree.parentTree && (
                    <span className="text-xs text-gray-400">
                      Fork de {tree.parentTree.title}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 mb-1">
                {tree.title}
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {tree._count.documents} docs
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {tree._count.forks} forks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(tree.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
