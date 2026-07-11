"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  MoreHorizontal,
  Plus,
  Redo2,
  Send,
  Underline,
  Undo2,
} from "lucide-react";
import styles from "./Linus2Workspace.module.css";

type SaveState = "saved" | "saving";

interface DemoSection {
  id: number;
  title: string;
  status: "complete" | "progress" | "empty";
  content: string;
}

const SECTIONS: DemoSection[] = [
  {
    id: 1,
    title: "Presentación",
    status: "complete",
    content: "<h1>Presentación</h1><p>Este kernel propone una base educativa abierta, adaptable y compartida para comunidades de aprendizaje.</p><h2>Objetivo general</h2><p>Organizar principios, prácticas y recursos que puedan evolucionar sin perder trazabilidad.</p>",
  },
  {
    id: 2,
    title: "Propósito del kernel",
    status: "complete",
    content: "<h1>Propósito del kernel</h1><p>Facilitar la creación de currículos contextualizados y permitir que cada comunidad extienda el conocimiento existente.</p><h2>Alcance</h2><ul><li>Educación abierta y colaborativa.</li><li>Adaptación a contextos locales.</li><li>Mejora continua mediante versiones.</li></ul>",
  },
  {
    id: 3,
    title: "Filosofía educativa",
    status: "progress",
    content: "<h1>Filosofía educativa</h1><p>La educación es el proceso de facilitar el aprendizaje y la adquisición de conocimientos, habilidades, valores y hábitos. Este kernel parte de una premisa simple: toda persona tiene derecho a aprender.</p><h2>Principios fundamentales</h2><ul><li>Respeto por la diversidad y los ritmos individuales.</li><li>Pensamiento crítico por encima de la memorización.</li><li>Colaboración entre pares como motor del aprendizaje.</li><li>Adaptación al contexto cultural y social.</li></ul><h2>Propósito</h2><p>El currículo funciona como una base abierta, adaptable y compartida. Cada comunidad puede extenderla sin perder trazabilidad.</p>",
  },
  { id: 4, title: "Principios pedagógicos", status: "progress", content: "<h1>Principios pedagógicos</h1><p>El aprendizaje se construye con experiencias significativas, práctica reflexiva y colaboración.</p>" },
  { id: 5, title: "Competencias clave", status: "empty", content: "<h1>Competencias clave</h1><p>Empezá a desarrollar esta sección.</p>" },
  { id: 6, title: "Enfoques de enseñanza", status: "empty", content: "<h1>Enfoques de enseñanza</h1><p>Empezá a desarrollar esta sección.</p>" },
  { id: 7, title: "Evaluación del aprendizaje", status: "empty", content: "<h1>Evaluación del aprendizaje</h1><p>Empezá a desarrollar esta sección.</p>" },
  { id: 8, title: "Inclusión y equidad", status: "empty", content: "<h1>Inclusión y equidad</h1><p>Empezá a desarrollar esta sección.</p>" },
  { id: 9, title: "Recursos y materiales", status: "empty", content: "<h1>Recursos y materiales</h1><p>Empezá a desarrollar esta sección.</p>" },
  { id: 10, title: "Referencias", status: "empty", content: "<h1>Referencias</h1><p>Empezá a desarrollar esta sección.</p>" },
];

function countWords(value: string) {
  return value.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export function Linus2Workspace() {
  const [activeId, setActiveId] = useState(3);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [published, setPublished] = useState(false);
  const [preview, setPreview] = useState(false);
  const [page, setPage] = useState(1);
  const [wordCount, setWordCount] = useState(countWords(SECTIONS[2].content));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSection = useMemo(
    () => SECTIONS.find((section) => section.id === activeId) ?? SECTIONS[0],
    [activeId],
  );

  const completed = SECTIONS.filter((section) => section.status === "complete").length;
  const progress = Math.round(((completed + 0.5) / SECTIONS.length) * 100);
  const pageCount = Math.max(1, Math.ceil(wordCount / 220));

  useEffect(() => {
    setWordCount(countWords(activeSection.content));
    setPage(1);
    setSaveState("saved");
  }, [activeSection]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function format(command: string, value?: string) {
    if (preview) return;
    document.execCommand(command, false, value);
  }

  function handleInput(event: React.FormEvent<HTMLElement>) {
    const html = event.currentTarget.innerHTML;
    setWordCount(countWords(html));
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 700);
  }

  function selectSection(id: number) {
    setActiveId(id);
  }

  return (
    <>
        <header className={styles.commandBar}>
          <div className={styles.breadcrumb}>Mi espacio <span>/</span> Kernel Educativo <span>/</span> Fundamentos</div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setPreview((value) => !value)}>
              <Eye size={16} /> {preview ? "Editar" : "Vista previa"}
            </button>
            <button type="button" className={styles.secondaryButton}><Download size={16} /> Exportar</button>
            <button type="button" className={styles.primaryButton} onClick={() => setPublished(true)}>
              {published ? <Check size={16} /> : <Send size={16} />}
              {published ? "Publicado" : "Publicar"}
            </button>
          </div>
        </header>

        <section className={styles.documentHeader}>
          <p className={styles.eyebrow}>KERNEL · DOCUMENTO 1 DE 3</p>
          <h1>Fundamentos del Currículo</h1>
          <div className={styles.documentMeta}>
            <span>Kernel Educativo — Linus</span>
            <span>Gustavo</span>
            <span className={styles.savedState}>
              {saveState === "saving" ? "Guardando…" : "✓ Guardado"}
            </span>
          </div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.sectionOutline}>
            <div className={styles.panelHeading}>
              <span>Secciones</span>
              <button type="button" title="Agregar sección"><Plus size={16} /></button>
            </div>

            <label className={styles.mobileSectionSelect}>
              <span>Sección</span>
              <select value={activeId} onChange={(event) => selectSection(Number(event.target.value))}>
                {SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.id}. {section.title}</option>)}
              </select>
              <ChevronDown size={16} />
            </label>

            <div className={styles.sectionList}>
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`${styles.sectionItem} ${section.id === activeId ? styles.sectionActive : ""}`}
                  onClick={() => selectSection(section.id)}
                >
                  <GripVertical size={14} className={styles.dragIcon} />
                  <span className={styles.sectionNumber}>{section.id}</span>
                  <span className={styles.sectionText}>
                    <strong>{section.title}</strong>
                    <small>{section.status === "complete" ? "Completa" : section.status === "progress" ? "En progreso" : "Sin comenzar"}</small>
                  </span>
                  {section.status === "complete" && <CheckCircle2 size={15} className={styles.completeIcon} />}
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editorColumn}>
            {!preview && (
              <div className={styles.toolbar} role="toolbar" aria-label="Formato de documento">
                <select aria-label="Estilo de texto" onChange={(event) => format("formatBlock", event.target.value)} defaultValue="p">
                  <option value="p">Párrafo</option>
                  <option value="h1">Título 1</option>
                  <option value="h2">Título 2</option>
                </select>
                <span className={styles.toolDivider} />
                <button type="button" title="Negrita" onClick={() => format("bold")}><Bold size={17} /></button>
                <button type="button" title="Cursiva" onClick={() => format("italic")}><Italic size={17} /></button>
                <button type="button" title="Subrayado" onClick={() => format("underline")}><Underline size={17} /></button>
                <span className={styles.toolDivider} />
                <button type="button" title="Alinear a la izquierda" onClick={() => format("justifyLeft")}><AlignLeft size={17} /></button>
                <button type="button" title="Centrar" onClick={() => format("justifyCenter")}><AlignCenter size={17} /></button>
                <button type="button" title="Alinear a la derecha" onClick={() => format("justifyRight")}><AlignRight size={17} /></button>
                <button type="button" title="Lista" onClick={() => format("insertUnorderedList")}><List size={17} /></button>
                <button type="button" title="Enlace"><LinkIcon size={17} /></button>
                <button type="button" title="Imagen"><ImageIcon size={17} /></button>
                <span className={styles.toolDivider} />
                <button type="button" title="Deshacer" onClick={() => format("undo")}><Undo2 size={17} /></button>
                <button type="button" title="Rehacer" onClick={() => format("redo")}><Redo2 size={17} /></button>
              </div>
            )}

            <div className={styles.pageStatus}>
              <span>Página {page} de {pageCount}</span>
              <div>
                <button type="button" title="Página anterior" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button>
                <button type="button" title="Página siguiente" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className={styles.pageCanvas}>
              <article
                key={activeSection.id}
                className={`${styles.documentPage} ${preview ? styles.previewPage : ""}`}
                contentEditable={!preview}
                suppressContentEditableWarning
                onInput={handleInput}
                dangerouslySetInnerHTML={{ __html: activeSection.content }}
              />
            </div>

            <footer className={styles.editorFooter}>
              <span>100%</span><span>A4</span><span>{wordCount.toLocaleString("es-AR")} palabras</span><span>Página {page} de {pageCount}</span>
            </footer>
          </section>

          <aside className={styles.inspector}>
            <div className={styles.panelHeading}><span>Documento</span><button type="button" title="Más opciones"><MoreHorizontal size={17} /></button></div>
            <section className={styles.inspectorSection}>
              <p>Progreso</p><strong>{completed} de {SECTIONS.length} secciones</strong>
              <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
            </section>
            <section className={styles.inspectorSection}><p>Contenido</p><strong>{wordCount.toLocaleString("es-AR")} palabras · {pageCount} páginas</strong></section>
            <section className={styles.inspectorSection}><p>Estado</p><strong className={styles.statusLine}><CheckCircle2 size={16} /> {published ? "Publicado" : "Borrador privado"}</strong></section>
            <section className={styles.inspectorSection}>
              <div className={styles.commentsHeading}><p>Comentarios</p><button type="button" title="Agregar comentario"><Plus size={15} /></button></div>
              <div className={styles.comment}><span>AN</span><div><strong>Ana</strong><p>Revisaría este principio antes de publicar.</p></div></div>
              <div className={styles.comment}><span>MG</span><div><strong>Marcos</strong><p>La introducción quedó clara.</p></div></div>
            </section>
          </aside>
        </div>
    </>
  );
}
