"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "@/hooks/useAppRouter";
import {
  ExternalLink,
  FileText,
  GitFork,
  Heart,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  MonitorSmartphone,
  Plus,
  Search,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { ResourceKind, TreeVisibility } from "@prisma/client";
import { TreePickerModal, type TreePickerResult } from "@/components/shared/TreePickerModal";

export interface AttachedResource {
  id: string;
  content: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    contentType: string;
    resourceKind: ResourceKind | null;
    resourceUrl: string | null;
    owner: { name: string | null; username: string | null; id?: string };
    _count: { likes: number; forks: number };
  };
}

const KIND_META: Record<ResourceKind, { label: string; icon: React.ReactNode }> = {
  EDITOR: { label: "Recurso editable", icon: <FileText className="h-4 w-4" /> },
  LINK: { label: "Enlace", icon: <LinkIcon className="h-4 w-4" /> },
  APP: { label: "App o herramienta", icon: <MonitorSmartphone className="h-4 w-4" /> },
  IMAGE: { label: "Imagen o infografía", icon: <ImageIcon className="h-4 w-4" /> },
  VIDEO: { label: "Video", icon: <Video className="h-4 w-4" /> },
  FILE: { label: "Archivo", icon: <Upload className="h-4 w-4" /> },
  REFERENCE: { label: "Referencia", icon: <ExternalLink className="h-4 w-4" /> },
};

const RESOURCE_KINDS = Object.keys(KIND_META) as ResourceKind[];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ResourcesPanel({
  containerSlug,
  containerId,
  initialItems,
  isOwner,
  defaultVisibility,
  compact = false,
}: {
  containerSlug: string;
  containerId: string;
  initialItems: AttachedResource[];
  isOwner: boolean;
  defaultVisibility: TreeVisibility;
  compact?: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialItems);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [kind, setKind] = useState<ResourceKind>("EDITOR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState("");

  function resetCreate(force = false) {
    if (saving && !force) return;
    setShowCreate(false);
    setKind("EDITOR");
    setTitle("");
    setDescription("");
    setUrl("");
    setFile(null);
    setError("");
  }

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setError("El archivo supera el máximo de 10 MB");
      return;
    }
    setFile(selected);
    setTitle((current) => current || selected.name.replace(/\.[^.]+$/, ""));
    if (selected.type.startsWith("image/")) setKind("IMAGE");
    else if (selected.type.startsWith("video/")) setKind("VIDEO");
    else setKind("FILE");
    setError("");
  }

  async function uploadSelectedFile() {
    if (!file) return url.trim();
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "No se pudo subir el archivo");
    return String(data.url);
  }

  async function attachResource(contentId: string) {
    const response = await fetch(`/api/trees/${containerSlug}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "No se pudo adjuntar el recurso");
    setItems((current) => [...current.filter((item) => item.content.id !== contentId), data]);
    return data as AttachedResource;
  }

  async function selectExisting(tree: TreePickerResult) {
    if (attaching) return;
    setShowPicker(false);
    setAttaching(true);
    setError("");
    try {
      await attachResource(tree.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo adjuntar el recurso");
    } finally {
      setAttaching(false);
    }
  }

  async function createResource(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    if (kind !== "EDITOR" && kind !== "REFERENCE" && !file && !url.trim()) {
      setError("Elegí un archivo o agregá una URL");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const resourceUrl = kind === "EDITOR" ? null : await uploadSelectedFile();
      const treeResponse = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          visibility: defaultVisibility,
          contentType: "RESOURCE",
          resourceKind: kind,
          resourceUrl,
        }),
      });
      const tree = await treeResponse.json().catch(() => ({}));
      if (!treeResponse.ok) throw new Error(tree.error ?? "No se pudo crear el recurso");

      let documentSlug: string | null = null;
      if (kind === "EDITOR") {
        const documentResponse = await fetch(`/api/trees/${tree.slug}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), treeId: tree.id }),
        });
        const document = await documentResponse.json().catch(() => ({}));
        if (!documentResponse.ok) throw new Error(document.error ?? "No se pudo preparar el editor del recurso");
        documentSlug = document.slug;
      }

      await attachResource(tree.id);
      resetCreate(true);
      if (documentSlug) {
        const username = session?.user?.username ?? session?.user?.name ?? "";
        router.push(`/${username}/${tree.slug}/${documentSlug}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el recurso");
    } finally {
      setSaving(false);
    }
  }

  async function detachResource(attachmentId: string, contentId: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== attachmentId));
    const response = await fetch(`/api/trees/${containerSlug}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (!response.ok) {
      setItems(previous);
      setError("No se pudo quitar el recurso");
    }
  }

  return (
    <section className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {compact
            ? <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-subtle">Recursos</h3>
            : <h2 className="text-xl font-semibold text-text">Recursos</h2>
          }
          <span className="rounded-full bg-resource/10 px-2 py-0.5 text-[10px] font-bold text-resource">{items.length}</span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setShowPicker(true)} disabled={attaching} className={compact
              ? "grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-bg hover:text-resource"
              : "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-muted hover:border-resource/30 hover:text-resource"
            } aria-label="Adjuntar recurso existente">
              {attaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} {!compact && "Adjuntar"}
            </button>
            <button type="button" onClick={() => { setShowCreate(true); setError(""); }} className={compact
              ? "grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-bg hover:text-resource"
              : "flex items-center gap-1.5 rounded-lg bg-resource px-3 py-2 text-xs font-semibold text-white hover:bg-resource-h"
            } aria-label="Crear recurso">
              <Plus className="h-3.5 w-3.5" /> {!compact && "Agregar"}
            </button>
          </div>
        )}
      </div>

      {error && !showCreate && <p role="alert" className="rounded-lg bg-danger/5 px-2.5 py-2 text-xs text-danger">{error}</p>}

      {items.length === 0 ? (
        <div className={compact
          ? "rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-text-subtle"
          : "rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-subtle"
        }>No hay recursos adjuntos.{isOwner && !compact && " Creá uno o adjuntá uno existente."}</div>
      ) : (
        <div className={compact ? "space-y-1.5" : "grid grid-cols-1 gap-3 md:grid-cols-2"}>
          {items.map((attachment) => {
            const resource = attachment.content;
            const kindValue = resource.resourceKind ?? "EDITOR";
            const meta = KIND_META[kindValue];
            const ownerSlug = resource.owner.username ?? resource.owner.name ?? resource.id;
            const internalHref = `/${ownerSlug}/${resource.slug}`;
            return (
              <article key={attachment.id} className={`group relative flex items-start gap-2.5 rounded-xl border border-resource/25 bg-surface ${compact ? "p-2.5" : "p-4"}`}>
                {resource.resourceUrl ? (
                  <a href={resource.resourceUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 rounded-xl" aria-label={`Abrir ${resource.title}`} />
                ) : (
                  <Link href={internalHref} className="absolute inset-0 rounded-xl" aria-label={`Ver ${resource.title}`} />
                )}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-resource/10 text-resource">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-resource">{resource.title}</p>
                  {!compact && resource.description && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{resource.description}</p>}
                  <p className="mt-1 text-[10px] text-text-subtle">{meta.label}{resource.owner.username ? ` · @${resource.owner.username}` : ""}</p>
                  {!compact && <div className="mt-2 flex gap-3 text-[10px] text-text-subtle"><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{resource._count.likes}</span><span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{resource._count.forks}</span></div>}
                </div>
                {resource.resourceUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-subtle" />}
                {isOwner && <button type="button" onClick={() => void detachResource(attachment.id, resource.id)} className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-danger/5 hover:text-danger" aria-label={`Quitar ${resource.title}`}><X className="h-3.5 w-3.5" /></button>}
              </article>
            );
          })}
        </div>
      )}

      <TreePickerModal open={showPicker} onClose={() => setShowPicker(false)} onSelect={(tree) => void selectExisting(tree)} allowedTypes={["RESOURCE"]} excludeTreeId={containerId} allowPrivate title="Adjuntar recurso" description="Elegí un recurso editable, enlace, app, archivo o referencia." />

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resetCreate(); }}>
          <form onSubmit={createResource} role="dialog" aria-modal="true" aria-labelledby="create-resource-title" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-3">
            <div><h2 id="create-resource-title" className="text-lg font-bold text-text">Agregar recurso</h2><p className="mt-0.5 text-xs text-text-muted">Puede ser contenido editable o material externo.</p><p className="mt-1 text-[10px] text-text-subtle">Se creará con la misma visibilidad del contenido actual.</p></div>
              <button type="button" onClick={() => resetCreate()} className="grid h-8 w-8 place-items-center rounded-lg text-text-subtle hover:bg-bg hover:text-text" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </header>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESOURCE_KINDS.map((value) => (
                <button key={value} type="button" onClick={() => { setKind(value); setFile(null); setUrl(""); }} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-[10px] font-semibold transition-colors ${kind === value ? "border-resource/40 bg-resource/10 text-resource" : "border-border text-text-muted hover:border-resource/25"}`}>
                  {KIND_META[value].icon}{KIND_META[value].label}
                </button>
              ))}
            </div>

            <label className="text-xs font-semibold text-text-muted">Título *<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Nombre del recurso" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text" /></label>
            <label className="text-xs font-semibold text-text-muted">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1_000} rows={2} placeholder="¿Cómo complementa el contenido?" className="mt-1 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text" /></label>

            {kind !== "EDITOR" && (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border p-4 text-center hover:border-resource/40 hover:bg-resource/5">
                  <Upload className="mx-auto mb-1 h-5 w-5 text-text-subtle" /><span className="block text-sm font-semibold text-text">{file ? file.name : "Seleccionar archivo"}</span><span className="text-xs text-text-subtle">Máximo 10 MB · sin ejecutables ni archivos comprimidos</span>
                </button>
                <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.docx,.pptx,.txt,.csv" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
                <div className="flex items-center gap-2 text-xs text-text-subtle"><span className="h-px flex-1 bg-border-subtle" /> o usá una URL <span className="h-px flex-1 bg-border-subtle" /></div>
                <label className="text-xs font-semibold text-text-muted">URL<input value={url} onChange={(event) => { setUrl(event.target.value); setFile(null); }} maxLength={2_000} placeholder="https://…" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text" /></label>
              </>
            )}

            {error && <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}
            <footer className="flex justify-end gap-2"><button type="button" onClick={() => resetCreate()} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-bg">Cancelar</button><button type="submit" disabled={saving || !title.trim() || (kind !== "EDITOR" && kind !== "REFERENCE" && !file && !url.trim())} className="flex items-center gap-1.5 rounded-lg bg-resource px-4 py-2 text-sm font-semibold text-white hover:bg-resource-h disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Creando…" : "Crear recurso"}</button></footer>
          </form>
        </div>
      )}
    </section>
  );
}
