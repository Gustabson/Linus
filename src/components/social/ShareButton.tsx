"use client";

import { useState } from "react";
import { AlertCircle, Check, Share2 } from "lucide-react";

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
  const [failed, setFailed] = useState(false);

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString();
    setFailed(false);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // If native sharing fails for another reason, continue with clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const succeeded = document.execCommand("copy");
      input.remove();
      if (!succeeded) {
        setFailed(true);
        window.setTimeout(() => setFailed(false), 2500);
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={() => void copyLink()} className={className} aria-label="Compartir enlace" title={failed ? "No se pudo copiar el enlace" : undefined}>
      {failed ? <AlertCircle className="h-4 w-4" /> : copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span className={compactOnMobile ? "hidden sm:inline" : ""}>{failed ? "No se pudo copiar" : copied ? "Copiado" : "Compartir"}</span>
    </button>
  );
}
