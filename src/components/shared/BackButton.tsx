"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors group ${className}`}
    >
      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
      <span>Volver</span>
    </button>
  );
}
