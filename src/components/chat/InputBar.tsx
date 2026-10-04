"use client";

import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import { Send, Loader2, Brain, Sparkles, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThinkMode } from "@/lib/nexra";

export function InputBar({
  value,
  onChange,
  onSend,
  busy,
  disabled,
  thinkMode,
  onThinkModeChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  disabled?: boolean;
  thinkMode: ThinkMode;
  onThinkModeChange: (m: ThinkMode) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const thinkModes: { id: ThinkMode; label: string; icon: React.ElementType; color: string }[] = [
    { id: "off", label: "OFF", icon: Zap, color: "text-zinc-500" },
    { id: "think", label: "THINK", icon: Brain, color: "text-cyan-300" },
    { id: "ultra", label: "ULTRA", icon: Sparkles, color: "text-indigo-300" },
    { id: "research", label: "ARA", icon: Search, color: "text-fuchsia-300" },
  ];

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-[#13131a]/80 backdrop-blur-sm transition-all duration-300",
        focused
          ? "border-violet-500/60 shadow-[0_0_24px_-4px_rgba(139,92,246,0.4)]"
          : "border-zinc-700/70"
      )}
    >
      <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-mono text-violet-400/70 bg-[#0a0a0f] tracking-widest">
        OPERATOR
      </span>

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={1}
        placeholder="nexra'ya bir sey yaz... (oyun: / kod: / animasyon: / piksel: / gorsel: / video: prefix — enter = gonder)"
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none max-h-44"
      />

      <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
        {/* Think toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0a0a0f]/60 border border-zinc-800">
          {thinkModes.map((m) => {
            const Icon = m.icon;
            const active = thinkMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onThinkModeChange(m.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono transition-all",
                  active
                    ? m.id === "off"
                      ? "bg-zinc-700/60 text-zinc-200"
                      : m.id === "think"
                      ? "bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_-2px_rgba(6,182,212,0.5)]"
                      : m.id === "ultra"
                      ? "bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_-2px_rgba(99,102,241,0.6)]"
                      : "bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_12px_-2px_rgba(217,70,239,0.6)]"
                    : "text-zinc-600 hover:text-zinc-400"
                )}
                title={m.id === "off" ? "mod kapali" : m.id === "think" ? "dusunme izi — beyin isareti cikar" : m.id === "ultra" ? "ultra derin dusunme — beyin isareti cikar" : "web arastirmasi — alt tarayici aktif"}
              >
                <Icon className={cn("w-3 h-3", (m.id === "think" || m.id === "ultra") && active && "animate-pulse")} />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">
          {value.length} karakter
        </span>

        <button
          onClick={onSend}
          disabled={!value.trim() || busy || disabled}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_16px_-2px_rgba(139,92,246,0.5)] hover:shadow-[0_0_20px_0px_rgba(139,92,246,0.7)]"
          title="Gonder"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
