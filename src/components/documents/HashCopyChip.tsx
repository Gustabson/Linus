"use client";

import { useState } from "react";
import { Copy, Check, Shield } from "lucide-react";

interface Props {
  hash:      string;
  className?: string;
}

export function HashCopyChip({ hash, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      title={`Hash completo: ${hash}`}
      className={`group flex items-center gap-1.5 font-mono text-xs text-gray-400 bg-gray-50 hover:bg-green-50 hover:text-green-700 px-2 py-1 rounded-lg transition-colors ${className}`}
    >
      <Shield className="w-3 h-3 text-green-500 shrink-0" />
      {hash.slice(0, 12)}…
      {copied
        ? <Check className="w-3 h-3 text-green-600 shrink-0" />
        : <Copy  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      }
    </button>
  );
}
