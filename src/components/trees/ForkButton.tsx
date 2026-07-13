"use client";

import { useState } from "react";
import { GitFork, X, Cpu, Loader2 } from "lucide-react";
import { useRouter } from "@/hooks/useAppRouter";
import { useSession } from "next-auth/react";

interface UserContainer { id: string; slug: string; title: string; contentType: "KERNEL" | "MODULE"; }

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
  const [containers, setContainers] = useState<UserContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const needsContainerPicker = contentType === "MODULE" || contentType === "RESOURCE";

  async function loadContainers() {
    setLoadingContainers(true);
    const types = contentType === "RESOURCE" ? "KERNEL,MODULE" : "KERNEL";
    const res = await fetch(`/api/trees/search?scope=mine&types=${types}&limit=20`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setContainers(data.trees ?? []);
    setLoadingContainers(false);
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
      const ownerUsername = session?.user?.username ?? session?.user?.name ?? "";
      if (res.ok && data.slug) { setShowModal(false); router.push(`/${ownerUsername}/${data.slug}`); }
      else alert(data.error ?? "Error al forkear");
    } finally { setLoading(false); }
  }

  if (!needsContainerPicker) {
    return (
      <button onClick={() => handleFork()} disabled={loading}
        className="flex items-center gap-2 border border-border text-text text-sm px-4 py-2 rounded-lg hover:bg-bg transition-colors disabled:opacity-50">
        <GitFork className="w-4 h-4" />
        {loading ? "Forkeando..." : "Forkear"}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => { setShowModal(true); void loadContainers(); }} disabled={loading}
        className="flex items-center gap-2 border border-border text-text text-sm px-4 py-2 rounded-lg hover:bg-bg transition-colors disabled:opacity-50">
        <GitFork className="w-4 h-4" />
        Forkear
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-text">Forkear &ldquo;{treeTitle}&rdquo;</h2>
                <p className="text-sm text-text-muted mt-0.5">
                  {contentType === "RESOURCE" ? "¿A qué kernel o módulo querés agregarlo?" : "¿A qué kernel querés agregarlo?"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-text-subtle hover:text-text-muted"><X className="w-5 h-5" /></button>
            </div>

            {loadingContainers ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-text-subtle animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {containers.length === 0 ? (
                  <p className="text-sm text-text-subtle text-center py-4">
                    No tenés un destino compatible. <a href="/nuevo" className="text-primary hover:underline">Crear contenido</a>
                  </p>
                ) : containers.map((container) => (
                  <button key={container.id} type="button"
                    onClick={() => setSelectedContainerId(selectedContainerId === container.id ? null : container.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selectedContainerId === container.id ? "border-primary bg-primary/5" : "border-border hover:border-gray-300"}`}>
                    <Cpu className={`w-4 h-4 shrink-0 ${selectedContainerId === container.id ? "text-primary" : "text-text-subtle"}`} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-text">{container.title}</span><span className="text-[10px] uppercase text-text-subtle">{container.contentType === "KERNEL" ? "Kernel" : "Módulo"}</span></span>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 ${selectedContainerId === container.id ? "border-primary bg-primary" : "border-gray-300"}`} />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => handleFork(null)} disabled={loading}
                className="flex-1 text-sm border border-border text-text-muted py-2.5 rounded-xl hover:bg-bg disabled:opacity-50 transition-colors">
                Sin adjuntar
              </button>
              {selectedContainerId && (
                <button onClick={() => handleFork(selectedContainerId)} disabled={loading}
                  className="flex-1 text-sm bg-primary text-white py-2.5 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors">
                  {loading ? "Forkeando..." : "Forkear y adjuntar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
