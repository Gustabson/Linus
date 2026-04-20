import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Shield, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  ACCOUNT_CREATED: "Cuenta creada",
  TREE_CREATED: "Currículo creado",
  TREE_FORKED: "Currículo forkeado",
  TREE_VISIBILITY_CHANGED: "Visibilidad cambiada",
  TREE_ARCHIVED: "Currículo archivado",
  DOCUMENT_CREATED: "Documento creado",
  VERSION_COMMITTED: "Versión guardada",
  PROPOSAL_OPENED: "Propuesta abierta",
  PROPOSAL_REVIEWED: "Propuesta revisada",
  PROPOSAL_MERGED: "Propuesta aceptada",
  PROPOSAL_WITHDRAWN: "Propuesta retirada",
  DOCUMENT_EXPORTED: "Documento exportado",
};

export default async function LedgerPage() {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { id: "desc" },
    take: 100,
    include: {
      actor: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-green-100 p-3 rounded-xl">
          <Shield className="w-6 h-6 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger público</h1>
          <p className="text-gray-500 text-sm">
            Registro inmutable y verificable de todos los eventos de la plataforma
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <strong>Cadena verificada.</strong> Cada entrada incluye el hash de la anterior.
          Si alguien modifica el pasado, los hashes dejan de coincidir y se detecta al instante.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {entries.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No hay entradas en el ledger aún.
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {EVENT_LABELS[entry.eventType] ?? entry.eventType}
                    </span>
                    <span className="text-xs text-gray-400">
                      por {entry.actor.name}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-400 truncate">
                    # {entry.entryHash}
                  </div>
                  {entry.previousEntryHash && (
                    <div className="font-mono text-xs text-gray-300 truncate">
                      ↳ {entry.previousEntryHash}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDate(entry.eventTimestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
