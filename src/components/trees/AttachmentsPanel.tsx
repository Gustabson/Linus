"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "@/hooks/useAppRouter";
import { FileText, GitFork, Heart, Loader2, Plus, Search, X } from "lucide-react";
import type { ContentType, ResourceKind, TreeVisibility } from "@prisma/client";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";
import { TreePickerModal, type TreePickerResult } from "@/components/shared/TreePickerModal";
import { ResourcesPanel, type AttachedResource } from "./ResourcesPanel";

interface AttachedTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentType: string;
  resourceKind: ResourceKind | null;
  resourceUrl: string | null;
  owner: { name: string | null; username: string | null; id?: string };
  _count: { likes: number; forks: number };
}

interface Attachment {
  id: string;
  content: AttachedTree;
}

const MODULE_META: {
  label: string;
  plural: string;
  emptyText: string;
  hint: string;
  placeholder: string;
} = {
  label: "Módulo",
  plural: "Módulos",
  emptyText: "No hay módulos adjuntos.",
  hint: "Creá una unidad didáctica o adjuntá una existente.",
  placeholder: "Ej: Unidad de Fracciones — 4to grado",
};

function AttachSection({
  kernelSlug,
  kernelId,
  initialItems,
  canAdd,
  defaultVisibility,
}: {
  kernelSlug: string;
  kernelId: string;
  initialItems: Attachment[];
  canAdd: boolean;
  defaultVisibility: TreeVisibility;
}) {
  const meta = MODULE_META;
  const style = CONTENT_TYPE_STYLE.MODULE;
  const router = useRouter();
  const { data: session } = useSession();
  const [items, setItems] = useState(initialItems);
  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!createTitle.trim() || creating) return;
    setCreating(true);
    setError("");

    const treeResponse = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle.trim(), contentType: "MODULE", visibility: defaultVisibility }),
    });
    const tree = await treeResponse.json().catch(() => ({}));
    if (!treeResponse.ok) {
      setError(tree.error ?? `No se pudo crear el ${meta.label.toLowerCase()}`);
      setCreating(false);
      return;
    }

    const documentResponse = await fetch(`/api/trees/${tree.slug}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle.trim(), treeId: tree.id }),
    });
    const document = await documentResponse.json().catch(() => ({}));
    if (!documentResponse.ok) {
      setError(document.error ?? "El contenido se creó, pero no se pudo crear su documento");
      setCreating(false);
      return;
    }

    const attachResponse = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: tree.id }),
    });
    const attachment = await attachResponse.json().catch(() => ({}));
    if (!attachResponse.ok) {
      setError(attachment.error ?? "El contenido se creó, pero no se pudo adjuntar");
      setCreating(false);
      return;
    }

    setItems((current) => [...current, attachment]);
    const username = session?.user?.username ?? session?.user?.name ?? "";
    router.push(`/${username}/${tree.slug}/${document.slug}`);
  }

  async function attach(tree: TreePickerResult) {
    if (attaching) return;
    setShowPicker(false);
    setAttaching(true);
    setError("");
    const response = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: tree.id }),
    });
    const attachment = await response.json().catch(() => ({}));
    if (response.ok) setItems((current) => [...current.filter((item) => item.content.id !== tree.id), attachment]);
    else setError(attachment.error ?? `No se pudo adjuntar el ${meta.label.toLowerCase()}`);
    setAttaching(false);
  }

  async function detach(attachmentId: string, contentId: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== attachmentId));
    const response = await fetch(`/api/trees/${kernelSlug}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (!response.ok) {
      setItems(previous);
      const result = await response.json().catch(() => ({}));
      setError(result.error ?? "No se pudo quitar el contenido");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-text">{meta.plural}</h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.badgeCls}`}>{items.length}</span>
        </div>
        {canAdd && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowPicker(true); setShowCreate(false); }} disabled={attaching} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50">
              {attaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Adjuntar
            </button>
            <button type="button" onClick={() => { setShowCreate((value) => !value); setShowPicker(false); setError(""); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${style.btnCls}`}>
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
        )}
      </div>

      {showCreate && canAdd && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-primary/20 bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Título del {meta.label.toLowerCase()} *</label>
            <input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} maxLength={160} placeholder={meta.placeholder} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-primary/40 focus:outline-none" />
          </div>
          <p className="flex items-center gap-1 text-xs text-text-subtle"><FileText className="h-3.5 w-3.5" /> Se crearán las secciones iniciales y vas a ir directo al editor.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-bg">Cancelar</button>
            <button type="submit" disabled={creating || !createTitle.trim()} className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm disabled:opacity-50 ${style.btnCls}`}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} {creating ? "Creando…" : "Crear y abrir editor"}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-subtle">
          {meta.emptyText}{canAdd && <span className="mt-0.5 block text-xs">{meta.hint}</span>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((attachment) => {
            const itemStyle = CONTENT_TYPE_STYLE[attachment.content.contentType as ContentType] ?? style;
            const ownerSlug = attachment.content.owner.username ?? attachment.content.owner.name ?? attachment.content.id;
            return (
              <article key={attachment.id} className={`group relative flex flex-col gap-2 rounded-xl border bg-surface p-4 transition-colors hover:shadow-sm ${itemStyle.borderCls} ${itemStyle.hoverBorderCls}`}>
                <Link href={`/${ownerSlug}/${attachment.content.slug}`} className="absolute inset-0 rounded-xl" aria-label={`Ver ${attachment.content.title}`} />
                <div className="flex items-start justify-between gap-2">
                  <p className={`flex-1 text-sm font-semibold ${itemStyle.textCls}`}>{attachment.content.title}</p>
                  {canAdd && <button type="button" onClick={() => void detach(attachment.id, attachment.content.id)} className="relative z-10 rounded-lg p-1.5 text-text-subtle transition-colors hover:bg-danger/5 hover:text-danger" aria-label={`Quitar ${attachment.content.title}`}><X className="h-3.5 w-3.5" /></button>}
                </div>
                <p className="text-xs text-text-subtle">{attachment.content.owner.username ? `@${attachment.content.owner.username}` : attachment.content.owner.name}</p>
                <div className="flex items-center gap-3 text-xs text-text-subtle">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{attachment.content._count.likes}</span>
                  <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{attachment.content._count.forks}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <TreePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(tree) => void attach(tree)}
        allowedTypes={["MODULE"]}
        excludeTreeId={kernelId}
        allowPrivate
        title={`Adjuntar ${meta.label.toLowerCase()}`}
        description={`Elegí un ${meta.label.toLowerCase()} de tu espacio o de la comunidad.`}
      />
    </section>
  );
}

export function AttachmentsPanel({
  kernelSlug,
  kernelId,
  initialAttachments,
  isOwner,
  containerType,
  containerVisibility,
}: {
  kernelSlug: string;
  kernelId: string;
  initialAttachments: Attachment[];
  isOwner: boolean;
  containerType: "KERNEL" | "MODULE";
  containerVisibility: TreeVisibility;
}) {
  const modules = initialAttachments.filter((item) => item.content.contentType === "MODULE");
  const resources = initialAttachments.filter((item) => item.content.contentType === "RESOURCE") as AttachedResource[];

  return (
    <div className="space-y-8">
      {containerType === "KERNEL" && (
        <AttachSection kernelSlug={kernelSlug} kernelId={kernelId} initialItems={modules} canAdd={isOwner} defaultVisibility={containerVisibility} />
      )}
      <ResourcesPanel containerSlug={kernelSlug} containerId={kernelId} initialItems={resources} isOwner={isOwner} defaultVisibility={containerVisibility} />
    </div>
  );
}
