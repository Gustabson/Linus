# Informe de auditoría — LINUG

**Actualizado:** 13 de julio de 2026
**Alcance:** marca, seguridad, integridad de datos, manejo de errores, rendimiento básico y compilación.

## Correcciones aplicadas

- Renombrado visible y técnico de la marca anterior a `LINUG`/`linug` en interfaz, metadatos, correos, documentación, ejemplos y paquete npm.
- Migración compatible hacia `linug_theme`; las preferencias existentes no se pierden y la cookie anterior se elimina progresivamente.
- Validación estricta de las cookies de tema: sólo se aceptan modos conocidos y colores hexadecimales, evitando CSS inválido o manipulado.
- Protección CSRF de defensa en profundidad en las 41 operaciones `POST`, `PATCH` y `DELETE` de la API.
- Lectura limitada de cuerpos JSON en correos, posts, configuración y verificación de email.
- Validación de tipos sin conversiones implícitas en correos, borradores, respuestas, posts y URLs de imágenes.
- Límites persistentes por usuario para posts, reportes, correos, respuestas, reenvío de verificación e importación de documentos.
- Reenvío de verificación restringido a la dirección de la sesión autenticada.
- Subidas verificadas por tamaño, extensión, firma binaria y contenido activo. PDF, DOCX y PPTX con acciones, macros, scripts u objetos ejecutables son rechazados.
- La importación del editor comparte las mismas comprobaciones de PDF/DOCX y tiene límite de frecuencia para reducir abuso de CPU y almacenamiento.
- Confirmaciones nativas del navegador reemplazadas por diálogos de la interfaz; errores de red ahora se muestran sin dejar botones bloqueados.
- Corregido el archivado que redirigía al dashboard incluso cuando la API había fallado.
- Corregidos estados de error al forkear, renombrar, importar y eliminar documentos o secciones.
- URLs de imágenes de posts limitadas a los hosts admitidos por `next/image`, evitando publicaciones que rompían al renderizar.

## Verificación

- `npm audit`: 0 vulnerabilidades.
- Prisma: esquema válido.
- TypeScript: 0 errores.
- Vitest: 12 archivos y 86 pruebas aprobadas.
- Next.js: compilación optimizada de producción aprobada.
- Búsqueda completa: no quedan referencias literales a la marca anterior; el nombre previo de cookie se construye dinámicamente sólo para migración.

## Decisiones conservadas

- La ruta experimental `/linus-2` permanece por compatibilidad con la prueba visual existente. Comparte los componentes principales y no duplica la lógica de datos.
- La política CSP todavía necesita `unsafe-inline` para los scripts y estilos generados por Next.js. El resto de las directivas restringe objetos, frames, formularios, imágenes y conexiones.
- La cookie de tema no es `HttpOnly` porque debe aplicarse antes de la hidratación para evitar parpadeos; contiene únicamente colores y modo, nunca credenciales.
