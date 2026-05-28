"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-1 flex flex-col items-center py-1.5 bg-surface-2 rounded-[10px] transition-colors active:bg-surface-3"
    >
      <span className="text-[13px] font-bold font-mono text-mint">{code}</span>
      <span className="text-[9px] text-text-faint uppercase tracking-wider mt-0.5">
        {copied ? "copiado ✓" : "toque pra copiar"}
      </span>
    </button>
  );
}
