"use client";

import { SWRConfig } from "swr";

// Fetcher genérico — toda la app usa el mismo
export const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Provider para SWR con config global ────────────────────────────────────
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,            // no recargar al volver a la pestaña
        revalidateIfStale: true,             // recargar si está vencido
        dedupingInterval: 5000,              // no duplicar requests en 5s
        errorRetryCount: 2,                  // reintentar 2 veces si falla
      }}
    >
      {children}
    </SWRConfig>
  );
}
