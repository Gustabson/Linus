"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, MinusCircle, Loader2 } from "lucide-react";

interface Props {
  proposalId: string;
  isAuthor: boolean;
  isTargetOwner: boolean;
}

export function ProposalActions({ proposalId, isAuthor, isTargetOwner }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState("");

  async function act(action: "accept" | "reject" | "withdraw") {
    setLoading(action);
    setError("");
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al procesar");
    }
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100">
      {isTargetOwner && (
        <>
          <button
            onClick={() => act("accept")}
            disabled={!!loading}
            className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {loading === "accept" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aceptar y fusionar
          </button>
          <button
            onClick={() => act("reject")}
            disabled={!!loading}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 text-sm px-4 py-2 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {loading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Rechazar
          </button>
        </>
      )}
      {isAuthor && (
        <button
          onClick={() => act("withdraw")}
          disabled={!!loading}
          className="flex items-center gap-2 text-gray-500 border border-gray-200 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading === "withdraw" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-4 h-4" />}
          Retirar propuesta
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
