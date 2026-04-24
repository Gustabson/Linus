"use client";

import { useState } from "react";
import { GitFork, X, Cpu, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserKernel { id: string; slug: string; title: string; }

export function ForkButton({
  treeId,
  treeTitle,
  contentType = "KERNEL",
}: {
  treeId: string;
  treeTitle: string;
  contentType?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [kernels, setKernels] = useState<UserKernel[]>([]);
  const [loadingKernels, setLoadingKernels] = useState(false);
  const [selectedKernelId, setSelectedKernelId] = useState<string | null>(null);
  const router = useRouter();

  const needsKernelPicker = contentType === "MODULE" || contentType === "RESOURCE";

  async function loadKernels() {
    setLoadingKernels(true);
    const res = await fetch("/api/users/kernels");
    if (res.ok) setKernels(await res.json());
    setLoadingKernels(false);
  }

  async function handleFork(targetKernelId?: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/trees/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId, targetKernelId: targetKernelId ?? null }),
      });
      const data = await res.json();
      if (res.ok && data.slug) { setShowModal(false); router.push(`/t/${data.slug}`); }
      else alert(data.error ?? "Error al forkear");
    } finally { setLoading(false); }
  }

  if (!needsKernelPicker) {
    return (
      <button onClick={() => handleFork()} disabled={loading}
        className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
        <GitFork className="w-4 h-4" />
        {loading ? "Forkeando..." : "Forkear"}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => { setShowModal(true); loadKernels(); }} disabled={loading}
        className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
        <GitFork className="w-4 h-4" />
        Forkear
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Forkear &ldquo;{treeTitle}&rdquo;</h2>
                <p className="text-sm text-gray-500 mt-0.5">¿A qué kernel querés agregarlo?</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {loadingKernels ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {kernels.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No tenés kernels. <a href="/nuevo" className="text-green-700 hover:underline">Crear uno</a>
                  </p>
                ) : kernels.map((k) => (
                  <button key={k.id} type="button"
                    onClick={() => setSelectedKernelId(selectedKernelId === k.id ? null : k.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selectedKernelId === k.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <Cpu className={`w-4 h-4 shrink-0 ${selectedKernelId === k.id ? "text-green-600" : "text-gray-400"}`} />
                    <span className="text-sm text-gray-900 truncate">{k.title}</span>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 ${selectedKernelId === k.id ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => handleFork(null)} disabled={loading}
                className="flex-1 text-sm border border-gray-200 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Sin agregar a ningún kernel
              </button>
              {selectedKernelId && (
                <button onClick={() => handleFork(selectedKernelId)} disabled={loading}
                  className="flex-1 text-sm bg-green-700 text-white py-2.5 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">
                  {loading ? "Forkeando..." : "Agregar al kernel"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
