# Plan: Navegación instantánea — Middleware + SWR

## Problema
`force-dynamic` en layout raíz fuerza render completo del servidor en CADA clic.
No hay caché de CDN, no hay caché en navegador, no hay nada.

## Arquitectura objetivo (2 fases)

### Fase 1 — Middleware (saca `force-dynamic` del layout)
```
Antes:  layout.tsx → auth() → prisma → force-dynamic → TODO lento
Ahora:  middleware.ts → auth check → pasa sesión y tema al layout
        layout.tsx → SIN force-dynamic → las páginas usan revalidate
```

**Archivos a tocar:**
- `src/middleware.ts` (nuevo) — auth check + tema en cookies
- `src/lib/auth.ts` — exportar helper para middleware
- `src/app/layout.tsx` — quitar auth() + prisma, leer tema de cookies
- `src/components/layout/ThemeProvider.tsx` — leer tema de cookie
- Varias páginas: agregar `revalidate = N` según caducidad

### Fase 2 — SWR (caché en navegador)
```
Antes:  cada clic → servidor → DB → HTML completo
Ahora:  primer clic → servidor → DB → HTML + SWR guarda datos
        volver atrás → SWR devuelve datos al instante → revalida en fondo
```

**Archivos a tocar:**
- `src/hooks/use-feed.ts` (nuevo) — SWR hook para posts del feed
- `src/hooks/use-trees.ts` (nuevo) — SWR hook para kernels/módulos/recursos
- `src/hooks/use-user.ts` (nuevo) — SWR hook para datos de usuario
- `src/app/page.tsx` — usar hook SWR en vez de fetch server-side
- `src/app/dashboard/page.tsx` — usar hook SWR
- `src/components/social/PostFeed.tsx` — hidratar desde SWR

### Resultado esperado
- Navegación entre páginas ya visitadas: instantánea (datos en memoria)
- Primera carga de cada página: 30-60s cache CDN
- Solo se regenera si los datos cambiaron (stale-while-revalidate)
- Un solo archivo de hooks, fácil de mantener
