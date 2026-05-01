"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, Loader2, X } from "lucide-react";

interface Props {
  sourceTreeId: string;
  parentTreeTitle: string;
}

export function CreateProposalButton({ sourceTreeId, parentTreeTitle }: Props) {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/proposals", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sourceTreeId, title, description: desc }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push(`/propuestas/${data.id}`);
    } else {
      setError(data.error ?? "Error al crear");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-h transition-colors"
      >
        <GitPullRequest className="w-4 h-4" />
        Proponer cambios
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text">Proponer cambios</h2>
              <button onClick={() => setOpen(false)} className="text-text-subtle hover:text-text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted">
              Tus cambios se propondrán a{" "}
              <span className="font-medium text-text">{parentTreeTitle}</span>.
              El dueño del original recibirá una notificación.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Título de la propuesta *
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Actualización de objetivos de aprendizaje"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Explicá brevemente qué cambiaste y por qué..."
                  rows={3}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="text-sm text-text-muted px-4 py-2 rounded-xl hover:bg-bg">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-h disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
                  {loading ? "Enviando..." : "Enviar propuesta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
