"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  code,
  lang,
  children,
}: {
  code: string;
  lang?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="group relative my-3 rounded-lg overflow-hidden border border-violet-500/20 bg-[#0c0c12]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#13131c] border-b border-violet-500/15">
        <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300/70">
          {lang || "kod"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded text-zinc-400 hover:text-violet-200 hover:bg-violet-500/10 transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">kopyalandi</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>kopyala</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed font-mono text-zinc-100">
        <code>{children ?? code}</code>
      </pre>
    </div>
  );
}
