import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GitPullRequest, Send, Clock, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ProposalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_META: Record<ProposalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  OPEN:      { label: "Abierta",  cls: "bg-blue-50 text-blue-700",   icon: <Clock       className="w-3.5 h-3.5" /> },
  ACCEPTED:  { label: "Aceptada", cls: "bg-green-50 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  REJECTED:  { label: "Rechazada",cls: "bg-red-50 text-red-600",     icon: <XCircle     className="w-3.5 h-3.5" /> },
  WITHDRAWN: { label: "Retirada", cls: "bg-border-subtle text-text-muted",  icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

export default async function PropuestasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tab = "recibidas" } = await searchParams;
  const userId = session.user.id;

  const [received, sent] = await Promise.all([
    prisma.changeProposal.findMany({
      where:   { targetTree: { ownerId: userId } },
      include: {
        sourceTree: { select: { slug: true, title: true, contentType: true } },
        targetTree: { select: { slug: true, title: true } },
        author:     { select: { name: true, username: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.changeProposal.findMany({
      where:   { authorId: userId },
      include: {
        sourceTree: { select: { slug: true, title: true } },
        targetTree: { select: { slug: true, title: true } },
        reviewer:   { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = tab === "enviadas" ? sent : received;
  const openCount = received.filter((p) => p.status === "OPEN").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <GitPullRequest className="w-6 h-6 text-green-600" />
          Propuestas
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: "recibidas", label: "Recibidas", count: received.length, badge: openCount },
          { key: "enviadas",  label: "Enviadas",  count: sent.length,     badge: 0 },
        ].map((t) => (
          <Link key={t.key} href={`/propuestas?tab=${t.key}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-green-600 text-green-700"
                : "border-transparent text-text-muted hover:text-text"
            }`}>
            {t.key === "recibidas" ? <GitPullRequest className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-green-100 text-green-700" : "bg-border-subtle text-text-muted"}`}>
              {t.count}
            </span>
            {t.badge > 0 && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* List */}
      {active.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-subtle">
          <GitPullRequest className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay propuestas {tab === "enviadas" ? "enviadas" : "recibidas"} todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((p) => {
            const meta = STATUS_META[p.status];
            const isReceived = tab === "recibidas";
            // @ts-expect-error union type — author present on received, reviewer on sent
            const person = isReceived ? p.author : p.reviewer;
            return (
              <Link key={p.id} href={`/propuestas/${p.id}`}
                className="block bg-surface rounded-2xl border border-border hover:border-green-300 hover:shadow-sm transition-all p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {isReceived && person?.image ? (
                    <Image src={person.image} alt="" width={36} height={36} className="rounded-full shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0 mt-0.5">
                      {(person?.name ?? "?")[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text truncate">{p.title}</p>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>

                    <p className="text-xs text-text-subtle mt-1">
                      {isReceived
                        ? <><span className="text-green-700">@{person?.username ?? person?.name}</span> quiere fusionar cambios en <span className="font-medium text-text">{p.targetTree?.title}</span></>
                        : <>Hacia <span className="font-medium text-text">{p.targetTree?.title}</span></>
                      }
                    </p>

                    <p className="text-xs text-text-subtle mt-0.5">{formatDate(p.createdAt)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
