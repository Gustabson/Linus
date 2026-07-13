"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Eye,
  GitBranch,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type { ContentType, DocumentSection } from "@prisma/client";
import { RichEditor } from "@/components/editor/RichEditor";
import { DocExportButton, type ExportSection } from "./DocExportButton";
import { DocumentComments } from "./DocumentComments";
import { TreePublishButton } from "@/components/trees/TreePublishButton";
import styles from "./DocumentWorkspace.module.css";
import { useRouter } from "@/hooks/useAppRouter";
import { EmbeddedPdf } from "./EmbeddedPdf";

type SaveState = "saved" | "saving" | "error";
type SectionIdMap = Record<string, string>;

interface DocumentWorkspaceProps {
  treeSlug: string;
  treeTitle: string;
  contentType: ContentType;
  docSlug: string;
  docTitle: string;
  docId: string;
  documentIndex: number;
  documentCount: number;
  ownerUsername: string;
  authorName: string;
  versionStatus: "DRAFT" | "PUBLISHED" | null;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  sections: DocumentSection[];
  isOwner: boolean;
  isAuthenticated: boolean;
  currentUserId?: string;
  initialPublicId: string | null;
  hasChanges: boolean;
}

function applySectionIdMap(sections: DocumentSection[], map: SectionIdMap) {
  if (!Object.keys(map).length) return sections;
  return sections.map((section) => ({ ...section, id: map[section.id] ?? section.id }));
}

function countWords(value: object | null | undefined): number {
  if (!value) return 0;
  let words = 0;
  function walk(node: Record<string, unknown>) {
    if (node.type === "text" && typeof node.text === "string") {
      words += node.text.trim().split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(node.content)) {
      (node.content as Record<string, unknown>[]).forEach(walk);
    }
  }
  walk(value as Record<string, unknown>);
  return words;
}

function statusLabel(section: DocumentSection) {
  if (section.isComplete) return "Completa";
  return countWords(section.richTextContent as object) > 0 ? "En progreso" : "Sin comenzar";
}

function workspaceContent(value: object, title: string): object {
  const doc = value as { type?: string; content?: Array<Record<string, unknown>> };
  const first = doc.content?.[0];
  if (first?.type !== "heading" || !Array.isArray(first.content)) return value;
  const heading = (first.content as Array<Record<string, unknown>>)
    .map((node) => typeof node.text === "string" ? node.text : "")
    .join("")
    .trim()
    .toLocaleLowerCase("es");
  if (heading !== title.trim().toLocaleLowerCase("es")) return value;
  return { ...doc, content: doc.content?.slice(1) ?? [] };
}

export function DocumentWorkspace({
  treeSlug,
  treeTitle,
  contentType,
  docSlug,
  docTitle,
  docId,
  documentIndex,
  documentCount,
  ownerUsername,
  authorName,
  versionStatus,
  visibility,
  sections: initialSections,
  isOwner,
  isAuthenticated,
  currentUserId,
  initialPublicId,
  hasChanges,
}: DocumentWorkspaceProps) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [activeId, setActiveId] = useState(initialSections[0]?.id ?? "");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [unpublishedChanges, setUnpublishedChanges] = useState(hasChanges);
  const [isPublished, setIsPublished] = useState(versionStatus === "PUBLISHED");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const initialDisplayTitle = contentType === "KERNEL" ? docTitle : treeTitle;
  const [titleValue, setTitleValue] = useState(initialDisplayTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [editorPage, setEditorPage] = useState(1);
  const [editorPageCount, setEditorPageCount] = useState(1);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSaves = useRef<Record<string, object>>({});
  const saveInFlight = useRef<string | null>(null);
  const sectionAliases = useRef<SectionIdMap>({});
  const saveWaiters = useRef<Array<(success: boolean) => void>>([]);
  const importInput = useRef<HTMLInputElement>(null);
  const cancelTitleEdit = useRef(false);
  const savedTitle = useRef(initialDisplayTitle);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? sections[0] ?? null,
    [activeId, sections],
  );
  const completed = sections.filter((section) => section.isComplete).length;
  const wordCount = activeSection ? countWords(activeSection.richTextContent as object) : 0;
  const progress = sections.length ? Math.round((completed / sections.length) * 100) : 0;
  const typeLabel = contentType === "KERNEL" ? "Kernel" : contentType === "MODULE" ? "Módulo" : "Recurso";
  const basePath = `/${ownerUsername}/${treeSlug}/${docSlug}`;
  const isPdfEmbed = (activeSection?.richTextContent as Record<string, unknown> | undefined)?.__type === "pdf_embed";

  useEffect(() => {
    setEditorPage(1);
    setEditorPageCount(1);
  }, [activeId]);

  const flushSection = useCallback(async (requestedId: string) => {
    const sectionId = sectionAliases.current[requestedId] ?? requestedId;
    if (sectionId !== requestedId && pendingSaves.current[requestedId]) {
      pendingSaves.current[sectionId] = pendingSaves.current[requestedId];
      delete pendingSaves.current[requestedId];
    }
    if (saveInFlight.current) return;
    const richTextContent = pendingSaves.current[sectionId];
    if (!richTextContent) return;

    delete pendingSaves.current[sectionId];
    saveInFlight.current = sectionId;
    let failed = false;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, richTextContent }),
      });
      if (!response.ok) throw new Error("save failed");
      const data = await response.json();
      const map: SectionIdMap = data.sectionIdMap ?? {};
      const nextId = map[sectionId] ?? sectionId;
      Object.assign(sectionAliases.current, map);

      for (const [oldId, mappedId] of Object.entries(map)) {
        if (pendingSaves.current[oldId]) {
          pendingSaves.current[mappedId] = pendingSaves.current[oldId];
          delete pendingSaves.current[oldId];
        }
        if (saveTimers.current[oldId]) {
          clearTimeout(saveTimers.current[oldId]);
          delete saveTimers.current[oldId];
        }
      }

      setSections((current) =>
        applySectionIdMap(current, map).map((section) =>
          section.id === nextId
            ? {
                ...section,
                richTextContent: (pendingSaves.current[nextId] ?? section.richTextContent) as never,
                isComplete: data.isComplete ?? true,
              }
            : section,
        ),
      );
      setActiveId((current) => map[current] ?? current);
    } catch {
      failed = true;
      const retryId = sectionAliases.current[sectionId] ?? sectionId;
      pendingSaves.current[retryId] = richTextContent;
      setSaveState("error");
    } finally {
      saveInFlight.current = null;
      const nextPendingId = Object.keys(pendingSaves.current)[0];
      if (nextPendingId && !failed) void flushSection(nextPendingId);
      else if (!nextPendingId) {
        setSaveState("saved");
        saveWaiters.current.splice(0).forEach((resolve) => resolve(true));
      } else if (failed) {
        saveWaiters.current.splice(0).forEach((resolve) => resolve(false));
      }
    }
  }, [docSlug, treeSlug]);

  const drainSaves = useCallback(async () => {
    for (const [id, timer] of Object.entries(saveTimers.current)) {
      clearTimeout(timer);
      delete saveTimers.current[id];
    }
    const pendingId = Object.keys(pendingSaves.current)[0];
    if (!saveInFlight.current && pendingId) void flushSection(pendingId);
    if (!saveInFlight.current && !pendingId) return true;
    return new Promise<boolean>((resolve) => saveWaiters.current.push(resolve));
  }, [flushSection]);

  useEffect(() => {
    function persistLastEdit() {
      const requestedId = activeId;
      const sectionId = sectionAliases.current[requestedId] ?? requestedId;
      const content = pendingSaves.current[sectionId] ?? pendingSaves.current[requestedId];
      if (!content || saveInFlight.current) return;
      const body = JSON.stringify({ sectionId, richTextContent: content });
      if (new TextEncoder().encode(body).byteLength > 60_000) return;
      void fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
    window.addEventListener("pagehide", persistLastEdit);
    return () => {
      window.removeEventListener("pagehide", persistLastEdit);
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [activeId, docSlug, treeSlug]);

  function handleEditorChange(sectionId: string, content: object) {
    setSections((current) => current.map((section) =>
      section.id === sectionId ? { ...section, richTextContent: content as never } : section,
    ));
    setSaveState("saving");
    setUnpublishedChanges(true);
    setIsPublished(false);
    const currentId = sectionAliases.current[sectionId] ?? sectionId;
    pendingSaves.current[currentId] = content;
    if (saveTimers.current[currentId]) clearTimeout(saveTimers.current[currentId]);
    saveTimers.current[currentId] = setTimeout(() => {
      delete saveTimers.current[currentId];
      void flushSection(currentId);
    }, 700);
  }

  function selectSection(sectionId: string) {
    const currentId = sectionAliases.current[activeId] ?? activeId;
    if (saveTimers.current[currentId]) {
      clearTimeout(saveTimers.current[currentId]);
      delete saveTimers.current[currentId];
    }
    if (pendingSaves.current[currentId]) void flushSection(currentId);
    setActiveId(sectionId);
  }

  async function handleAddSection(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    if (!(await drainSaves())) return;
    setAdding(true);
    const response = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (response.ok) {
      const data = await response.json();
      const next = {
        id: data.id,
        sectionType: data.sectionType,
        sectionOrder: data.sectionOrder,
        difficultyLevel: data.difficultyLevel ?? "BEGINNER",
        ageRangeMin: data.ageRangeMin ?? null,
        ageRangeMax: data.ageRangeMax ?? null,
        isComplete: false,
        richTextContent: data.richTextContent,
        gradeLevel: null,
        durationMinutes: data.durationMinutes ?? null,
        createdAt: new Date(),
        versionId: data.versionId,
      } as DocumentSection;
      setSections((current) => [...applySectionIdMap(current, data.sectionIdMap ?? {}), next]);
      setActiveId(data.id);
      setNewTitle("");
      setShowAdd(false);
      setUnpublishedChanges(true);
      setIsPublished(false);
    } else setSaveState("error");
    setAdding(false);
  }

  async function commitRename(sectionId: string) {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    if (!(await drainSaves())) return;
    const response = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, sectionTitle: title }),
    });
    if (response.ok) {
      const data = await response.json();
      const map: SectionIdMap = data.sectionIdMap ?? {};
      const nextId = map[sectionId] ?? sectionId;
      setSections((current) => applySectionIdMap(current, map).map((section) =>
        section.id === nextId ? { ...section, sectionType: title } : section,
      ));
      setActiveId((current) => map[current] ?? current);
      setUnpublishedChanges(true);
      setIsPublished(false);
    } else setSaveState("error");
    setRenamingId(null);
  }

  async function deleteSection(section: DocumentSection) {
    if (!window.confirm(`¿Eliminar la sección "${section.sectionType}"?`)) return;
    if (!(await drainSaves())) return;
    const response = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: section.id }),
    });
    if (!response.ok) { setSaveState("error"); return; }
    const data = await response.json();
    setSections((current) => {
      const remaining = applySectionIdMap(current.filter((item) => item.id !== section.id), data.sectionIdMap ?? {});
      setActiveId((currentId) => {
        const mapped = (data.sectionIdMap ?? {})[currentId] ?? currentId;
        return remaining.some((item) => item.id === mapped) ? mapped : remaining[0]?.id ?? "";
      });
      return remaining;
    });
    setUnpublishedChanges(true);
    setIsPublished(false);
  }

  async function importDocument(file: File) {
    if (!(await drainSaves())) return;
    setImporting(true);
    setShowDocumentMenu(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "split");
      let response = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, { method: "POST", body: formData });
      let data = await response.json().catch(() => ({}));
      if (response.ok && data.needsTitle) {
        const sectionTitle = window.prompt("Este PDF no tiene texto seleccionable. Escribí un título para la sección:", file.name.replace(/\.pdf$/i, ""));
        if (!sectionTitle?.trim()) return;
        const pending = new FormData();
        pending.append("blobUrl", data.blobUrl);
        pending.append("uploadToken", data.uploadToken);
        pending.append("sectionTitle", sectionTitle.trim().slice(0, 200));
        response = await fetch(`/api/trees/${treeSlug}/${docSlug}/import`, { method: "POST", body: pending });
        data = await response.json().catch(() => ({}));
      }
      if (!response.ok) throw new Error(data.error ?? "No se pudo importar el archivo.");

      const sectionsResponse = await fetch(`/api/trees/${treeSlug}/${docSlug}/sections`, { cache: "no-store" });
      if (!sectionsResponse.ok) throw new Error("El archivo se importó, pero no se pudo actualizar el editor.");
      const fresh = await sectionsResponse.json();
      const nextSections = Array.isArray(fresh.sections) ? fresh.sections as DocumentSection[] : [];
      setSections(nextSections);
      setActiveId(nextSections.at(-1)?.id ?? "");
      setUnpublishedChanges(true);
      setIsPublished(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo importar el archivo.");
    } finally {
      setImporting(false);
    }
  }

  async function deleteDocument() {
    setShowDocumentMenu(false);
    if (!window.confirm(`¿Eliminar el documento "${titleValue}"? Esta acción no se puede deshacer.`)) return;
    if (!(await drainSaves())) return;
    const response = await fetch(`/api/trees/${treeSlug}/${docSlug}`, { method: "DELETE" });
    if (response.ok) router.push(`/${ownerUsername}/${treeSlug}`);
    else window.alert("No se pudo eliminar el documento.");
  }

  async function commitDocumentTitle() {
    const title = titleValue.trim();
    if (!title) { setTitleValue(savedTitle.current); setEditingTitle(false); return; }
    if (!(await drainSaves())) return;
    setSavingTitle(true);
    try {
      const endpoint = contentType === "KERNEL"
        ? `/api/trees/${treeSlug}/${docSlug}`
        : `/api/trees/${treeSlug}/settings`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo renombrar el documento.");
      setTitleValue(title);
      savedTitle.current = title;
      setEditingTitle(false);
      if (contentType !== "KERNEL" && data.slug && data.slug !== treeSlug)
        router.replace(`/${ownerUsername}/${data.slug}/${docSlug}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo renombrar el documento.");
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <div className={styles.documentWorkspaceRoot} data-content-type={contentType}>
      <header className={styles.commandBar}>
        <nav className={styles.breadcrumb} aria-label="Ruta del documento">
          <Link href="/">Mi espacio</Link><span>/</span>
          <Link href={`/${ownerUsername}/${treeSlug}`}>{treeTitle}</Link><span>/</span>
          <span className={styles.currentCrumb}>{titleValue}</span>
        </nav>
        <div className={styles.headerActions}>
          <Link href={`${basePath}/preview`} className={styles.secondaryButton}><Eye size={16} /> <span>Vista previa</span></Link>
          <DocExportButton title={titleValue} sections={sections as ExportSection[]} treeSlug={treeSlug} docSlug={docSlug} workspace />
          {isOwner && (
            <TreePublishButton treeSlug={treeSlug} contentType={contentType} initialPublicId={initialPublicId} hasChanges={unpublishedChanges} disabled={saveState !== "saved"} onPublished={() => { setUnpublishedChanges(false); setIsPublished(true); }} workspace />
          )}
        </div>
      </header>

      <section className={styles.documentHeader}>
        <p className={styles.eyebrow}>{typeLabel.toUpperCase()} · DOCUMENTO {documentIndex} DE {documentCount}</p>
        <div className={styles.titleRow}>
          {editingTitle ? (
            <input autoFocus value={titleValue} maxLength={200} onChange={(event) => setTitleValue(event.target.value)} onBlur={() => {
              if (cancelTitleEdit.current) { cancelTitleEdit.current = false; return; }
              void commitDocumentTitle();
            }} onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
              if (event.key === "Escape") { cancelTitleEdit.current = true; setTitleValue(savedTitle.current); setEditingTitle(false); }
            }} />
          ) : (
            <h1>{titleValue}</h1>
          )}
          {isOwner && !editingTitle && <button type="button" title="Renombrar documento" onClick={() => setEditingTitle(true)}><Pencil size={15} /></button>}
          {savingTitle && <Loader2 size={14} className={styles.spin} />}
        </div>
        <div className={styles.documentMeta}>
          <span>{treeTitle} — Linus</span>
          <span>{authorName}</span>
          {saveState === "error" ? (
            <button type="button" className={styles.errorState} onClick={() => { const id = Object.keys(pendingSaves.current)[0]; if (id) void flushSection(id); }}>No se pudo guardar · Reintentar</button>
          ) : (
            <span className={styles.savedState}>{saveState === "saving" ? <><Loader2 size={12} className={styles.spin} /> Guardando…</> : <><Check size={13} /> Guardado</>}</span>
          )}
        </div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.sectionOutline}>
          <div className={styles.panelHeading}>
            <span>Secciones</span>
            {isOwner && <button type="button" title="Agregar sección" onClick={() => setShowAdd((value) => !value)}><Plus size={16} /></button>}
          </div>
          {showAdd && (
            <form className={styles.addSectionForm} onSubmit={handleAddSection}>
              <input autoFocus value={newTitle} maxLength={200} onChange={(event) => setNewTitle(event.target.value)} placeholder="Nombre de la sección" />
              <button aria-label="Confirmar nueva sección" disabled={adding || !newTitle.trim()}>{adding ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}</button>
            </form>
          )}
          <label className={styles.mobileSectionSelect}>
            <span>Sección</span>
            <select value={activeId} onChange={(event) => selectSection(event.target.value)}>
              {sections.map((section, index) => <option key={section.id} value={section.id}>{index + 1}. {section.sectionType}</option>)}
            </select>
          </label>
          <div className={styles.sectionList}>
            {sections.map((section, index) => (
              <div key={section.id} className={`${styles.sectionItem} ${section.id === activeId ? styles.sectionActive : ""}`}>
                {renamingId === section.id ? (
                  <div className={styles.sectionRenameRow}>
                    <GripVertical size={14} className={styles.dragIcon} aria-hidden="true" />
                    <span className={styles.sectionNumber}>{index + 1}</span>
                    <span className={styles.sectionText}>
                      <input aria-label="Nombre de la sección" autoFocus value={renameValue} maxLength={200} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => commitRename(section.id)} onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); commitRename(section.id); }
                        if (event.key === "Escape") setRenamingId(null);
                      }} />
                      <small>{statusLabel(section)}</small>
                    </span>
                  </div>
                ) : (
                  <button type="button" className={styles.sectionSelectButton} onClick={() => selectSection(section.id)}>
                    <GripVertical size={14} className={styles.dragIcon} aria-hidden="true" />
                    <span className={styles.sectionNumber}>{index + 1}</span>
                    <span className={styles.sectionText}><strong>{section.sectionType}</strong><small>{statusLabel(section)}</small></span>
                    {section.isComplete && <CheckCircle2 size={15} className={styles.completeIcon} />}
                  </button>
                )}
                {isOwner && renamingId !== section.id && (
                  <span className={styles.sectionActions}>
                    <button type="button" title="Renombrar" onClick={() => { setRenamingId(section.id); setRenameValue(section.sectionType); }}><Pencil size={12} /></button>
                    <button type="button" title="Eliminar" onClick={() => deleteSection(section)}><Trash2 size={12} /></button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.editorColumn}>
          {activeSection ? (
            <>
              {isPdfEmbed ? (
                <div className={styles.pdfCanvas}>
                  <div className={styles.pdfPage}>
                    <h1>{activeSection.sectionType}</h1>
                    <EmbeddedPdf url={(activeSection.richTextContent as Record<string, unknown>).url} title={activeSection.sectionType} />
                  </div>
                </div>
              ) : (
                <RichEditor
                  key={activeSection.id}
                  initialContentJson={workspaceContent(activeSection.richTextContent as object, activeSection.sectionType)}
                  onChangeJson={(content) => handleEditorChange(activeSection.id, content)}
                  onPageChange={(current, total) => { setEditorPage(current); setEditorPageCount(total); }}
                  placeholder={`Escribí el contenido de "${activeSection.sectionType}"…`}
                  editable={isOwner}
                  showUndoRedo
                  workspaceLayout
                  documentTitle={activeSection.sectionType}
                />
              )}
              <footer className={styles.editorFooter}>
                <span>100%</span><span>A4</span><span>{wordCount.toLocaleString("es-AR")} palabras</span><span>Página {editorPage} de {editorPageCount}</span>
              </footer>
            </>
          ) : (
            <div className={styles.emptyEditor}>
              <h2>Este documento todavía no tiene secciones</h2>
              <p>Agregá la primera sección desde el panel izquierdo para empezar a escribir.</p>
              {isOwner && <button type="button" onClick={() => setShowAdd(true)}><Plus size={16} /> Agregar sección</button>}
            </div>
          )}
        </section>

        <aside className={styles.inspector}>
          <div className={`${styles.panelHeading} ${styles.documentMenuAnchor}`}>
            <span>Documento</span>
            <button type="button" title="Más opciones" onClick={() => setShowDocumentMenu((value) => !value)}><MoreHorizontal size={17} /></button>
            {showDocumentMenu && (
              <div className={styles.documentMenu}>
                <Link href={`${basePath}/historial`} onClick={() => setShowDocumentMenu(false)}><GitBranch size={14} /> Historial</Link>
                {isOwner && <button type="button" onClick={() => importInput.current?.click()}><Upload size={14} /> Importar Word / PDF</button>}
                {isOwner && contentType === "KERNEL" && <button type="button" className={styles.dangerMenuItem} onClick={deleteDocument}><Trash2 size={14} /> Eliminar documento</button>}
              </div>
            )}
            <input ref={importInput} type="file" accept=".pdf,.docx" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) importDocument(file); }} />
          </div>
          {importing && <p className={styles.importingState}><Loader2 size={12} className={styles.spin} /> Importando archivo…</p>}
          <section className={styles.inspectorSection}>
            <p>Progreso</p><strong>{completed} de {sections.length} secciones</strong>
            <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
          </section>
          <section className={styles.inspectorSection}><p>Contenido</p><strong>{wordCount.toLocaleString("es-AR")} palabras · {editorPageCount} {editorPageCount === 1 ? "página" : "páginas"}</strong></section>
          <section className={styles.inspectorSection}><p>Estado</p><strong className={styles.statusLine}><CheckCircle2 size={16} /> {!isPublished || visibility === "PRIVATE" ? "Borrador privado" : "Publicado"}</strong></section>
          <section className={`${styles.inspectorSection} ${styles.commentsInspector}`}>
            <DocumentComments docId={docId} isAuthenticated={isAuthenticated} currentUserId={currentUserId} isOwner={isOwner} inspector />
          </section>
        </aside>
      </div>
    </div>
  );
}
