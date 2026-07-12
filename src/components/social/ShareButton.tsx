"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({
  path,
  className = "",
  compactOnMobile = false,
}: {
  path: string;
  className?: string;
  compactOnMobile?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={() => void copyLink()} className={className} aria-label="Copiar enlace">
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span className={compactOnMobile ? "hidden sm:inline" : ""}>{copied ? "Copiado" : "Compartir"}</span>
    </button>
  );
}
