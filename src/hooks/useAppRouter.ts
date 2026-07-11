"use client";

import { useMemo } from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";

function withAppPrefix(href: string, inLinus2: boolean) {
  if (!inLinus2 || !href.startsWith("/") || href.startsWith("/linus-2") || href.startsWith("/api/")) return href;
  return `/linus-2${href}`;
}

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname();
  const inLinus2 = pathname === "/linus-2" || pathname.startsWith("/linus-2/");

  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(withAppPrefix(href, inLinus2), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(withAppPrefix(href, inLinus2), options),
  }), [inLinus2, router]);
}
