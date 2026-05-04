"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackButton({ href, className = "" }: { href?: string; className?: string }) {
  const router = useRouter();

  const cls = `inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors group ${className}`;
  const icon = <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        <span>Volver</span>
      </Link>
    );
  }

  return (
    <button onClick={() => router.back()} className={cls}>
      {icon}
      <span>Volver</span>
    </button>
  );
}
