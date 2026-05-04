# Informe de Auditoría — EduHub
**Fecha:** Mayo 2026  
**Alcance:** Seguridad, bugs, limpieza, optimización, mantenibilidad

---

## 🔴 SEGURIDAD (2 issues)

### S1 — SVG en whitelist de upload permite XSS
**Archivo:** `src/app/api/upload/route.ts:9`  
**Riesgo:** Medio  
SVGs pueden contener `<script>`, event handlers y CSS malicioso. Aunque el CSP actual tiene `script-src 'unsafe-inline'`, un SVG inline podría ejecutar JS.
```diff
-  "svg",
+  // "svg",   ← eliminar o sanitizar con DOMPurify antes de servir
```
**Fix:** Quitar `svg` de `ALLOWED_EXTENSIONS` o sanitizar SVGs server-side.

### S2 — La mayoría de API routes no tienen try/catch
**Archivos:** ~28 de 37 routes sin manejo de errores  
**Riesgo:** Bajo-Medio  
Si Prisma lanza un error (DB caída, constraint violada), el error crudo se devuelve como 500 con stack trace. En producción Vercel no muestra el trace, pero es frágil.
**Fix:** Agregar `try/catch` o un wrapper en `api-helpers.ts`.

---

## 🟡 BUGS Y EDGE CASES (4 issues)

### B1 — Race condition en `uniqueSlug`
**Archivo:** `src/lib/api-helpers.ts:35-43`  
Ya está documentado en el comentario. La función `uniqueSlug` hace check + insert sin atomicidad.
**Fix:** Los callers deberían wrappear en `try/catch` y reintentar en `P2002`. Verificar que `trees/route.ts` y `trees/[slug]/documents/route.ts` lo hagan.

### B2 — `fetchForkSubtree` recursivo sin límite real de DB queries
**Archivo:** `src/app/[username]/[slug]/page.tsx:36-61`  
3 niveles de profundidad con `Promise.all` de children. Si un árbol tiene 20 forks por nivel, son potencialmente 20 + 400 + 8000 queries. El `take: 20` ayuda pero no es un límite duro.
**Fix:** Agregar un contador global de queries o mover a una vista materializada si escala.

### B3 — Layout `auth()` corre en cada request aunque la página tenga `revalidate`
**Archivo:** `src/app/layout.tsx`  
`auth()` es necesario para pasar sesión al `SessionProvider`. Pero en páginas cacheadas por ISR, el layout se ejecuta igual. NextAuth ya cachea internamente el JWT verify, así que el impacto es mínimo (~1ms).
**Estado:** OK por ahora. Monitorear si crece.

### B4 — `getOwnedKernel` no verifica visibility
**Archivo:** `src/lib/api-helpers.ts:22`  
Solo checkea `ownerId` y `contentType === "KERNEL"`. Si un kernel es `PRIVATE`, teóricamente solo el owner debería verlo. Pero el check de visibilidad está en la página (`[username]/[slug]/page.tsx:113`), no en el helper.
**Fix:** Agregar check de visibility en `getOwnedTree`/`getOwnedKernel` o documentar que la responsabilidad es del caller.

---

## 🟢 OPTIMIZACIÓN (3 issues)

### O1 — `Post.createdAt` sin índice compuesto con `authorId`
**Archivo:** `prisma/schema.prisma:471`  
Al filtrar posts por autor Y ordenar por fecha, el índice `@@index([createdAt])` no se usa completamente. Debería ser `@@index([authorId, createdAt])`.
**Fix:** Agregar índice compuesto.

### O2 — `DocumentTree.updatedAt` sin índice
**Archivo:** `prisma/schema.prisma`  
El dashboard ordena `orderBy: { updatedAt: "desc" }` sin índice. Para pocos usuarios no es problema, pero con 1000+ trees por usuario se vuelve lento.
**Fix:** `@@index([ownerId, updatedAt])`.

### O3 — Attachments cargan todos los datos en una sola query
**Archivo:** `src/app/[username]/[slug]/page.tsx:94-105`  
Los attachments incluyen `content.owner` y `_count` en la query principal. Para kernels con 50+ attachments, es mucha data innecesaria si el usuario no scrollea hasta abajo.
**Fix:** Lazy-load attachments o paginar.

---

## 🔵 MANTENIBILIDAD (5 issues)

### M1 — 37 API route files, sin estructura común
Cada route tiene su propio patrón de error handling, validación y response. Un wrapper `withAuth(handler)` en `api-helpers.ts` reduciría 37 repeticiones de:
```ts
const session = await getSession();
if (!session) return unauthorized();
```
**Fix:** Crear `withAuth(fn)` wrapper.

### M2 — Prisma `select` shapes repetidos
El patrón `{ id: true, name: true, username: true, image: true }` aparece en ~12 lugares. Ya existe `USER_BASIC_SELECT` en `lib/data.ts` pero no se usa en todas partes.
**Fix:** Reemplazar todos los inline selects con `USER_BASIC_SELECT`.

### M3 — `dangerouslySetInnerHTML` en CorreosDetalle
**Archivo:** `src/components/correos/CorreosDetalle.tsx:393,412`  
Está bien sanitizado server-side, pero si alguien agrega un nuevo endpoint de correos sin sanitizar, hay XSS. La dependencia está implícita.
**Fix:** Mover la sanitización a un helper compartido y usarlo en TODOS los endpoints de correos + agregar test.

### M4 — CSS variables duplicadas en `globals.css`
`--primary-h`, `--kernel-h`, `--module-h`, `--resource-h` se definen igual que sus padres pero con menos opacidad. Si se agrega un nuevo color (`--newcolor`), hay que recordar agregar `--newcolor-h`.
**Fix:** Podrían generarse automáticamente con un postcss plugin o definir `-h` como `color-mix(in srgb, var(--kernel) 80%, black)` en CSS moderno.

### M5 — Scroll-to-top duplicado
Tanto `PostFeed` como `ProfileFeed` tienen botón de scroll-to-top implementado de forma ligeramente distinta. Deberían compartir un componente `ScrollToTop`.
**Fix:** Extraer a `components/shared/ScrollToTop.tsx`.

---

## ⚪ LIMPIEZA (3 issues)

### L1 — `tsconfig.tsbuildinfo` en git
El archivo de build cache de TypeScript aparece en `git status` cada vez. Debería estar en `.gitignore`.
**Fix:** Agregar `tsconfig.tsbuildinfo` a `.gitignore`.

### L2 — Componentes con 4+ `useState`
`PostFeed` (4), `PostComposer` (6), `AttachmentsPanel` (8). Podrían beneficiarse de `useReducer` o custom hooks para separar lógica de UI.
**Fix:** Extraer a custom hooks (`useFeedState`, `useAttachmentState`).

### L3 — `SocialFeed` hace 3 queries en paralelo pero suggested users no se usan si el panel está oculto
**Archivo:** `src/components/social/SocialFeed.tsx:52-62`  
Siempre se fetchean 5 suggested users aunque el sidebar solo se muestra en desktop (≥1024px). En mobile es query desperdiciada.
**Fix:** Mover suggested users a client-side fetch condicional o usar CSS media query + `useMediaQuery`.

---

## 📊 RESUMEN

| Categoría | Issues | Prioridad |
|---|---|---|
| Seguridad | 2 | Alta |
| Bugs | 4 | Media |
| Optimización | 3 | Media |
| Mantenibilidad | 5 | Baja-Media |
| Limpieza | 3 | Baja |

**Recomendación de orden de trabajo:**
1. S1 (SVG XSS) — 1 línea, alto impacto
2. O1 + O2 (índices DB) — mejora velocidad real
3. M1 (withAuth wrapper) — reduce 37 repeticiones, previene bugs futuros
4. M2 (USER_BASIC_SELECT en todas partes) — consistencia
5. L1 (gitignore tsbuildinfo) — 1 línea
6. B1 (uniqueSlug race condition) — verificar callers
7. M5 (ScrollToTop compartido) — DRY
8. L2 (custom hooks) — opcional, solo si los componentes crecen más
