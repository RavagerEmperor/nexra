"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, X, Send, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Line = {
  id: string;
  type: "in" | "out" | "err" | "sys";
  text: string;
};

export function AgentTerminal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([
    { id: "boot", type: "sys", text: "NEXRA Prime Agent Terminal v1.0 — 'help' yaz." },
  ]);
  const [input, setInput] = useState("");
  const [vfs, setVfs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const push = (type: Line["type"], text: string) => {
    setLines((prev) => [...prev, { id: Math.random().toString(36).slice(2), type, text }]);
  };

  const run = async (cmd: string) => {
    if (!cmd.trim()) return;
    push("in", cmd);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, vfs }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.output) push("out", data.output);
        else push("sys", "(bos cikti)");
      } else {
        push("err", data.output || "komut basarisiz");
      }
      if (data.vfs) setVfs(data.vfs);
    } catch {
      push("err", "terminal baglantisi dustu");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => setLines([]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:left-72 md:right-0 h-[360px] border-t border-cyan-500/30 bg-[#070710]/95 backdrop-blur-xl flex flex-col"
        >
          {/* header */}
          <div className="shrink-0 h-9 px-3 flex items-center gap-2 border-b border-cyan-500/20 bg-[#0a0a14]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500/60" />
              <span className="w-2 h-2 rounded-full bg-amber-500/60" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
            </div>
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300/80">
              nexra@prime:~$
            </span>
            <span className="text-[10px] font-mono text-zinc-600 ml-1">
              agent terminal
            </span>
            <div className="flex-1" />
            <button
              onClick={clear}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition"
              title="Temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 transition"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* output */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed"
            style={{ scrollbarWidth: "thin" }}
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  l.type === "in" && "text-zinc-300",
                  l.type === "out" && "text-emerald-200/80",
                  l.type === "err" && "text-rose-300",
                  l.type === "sys" && "text-cyan-400/60 italic"
                )}
              >
                {l.type === "in" ? (
                  <span className="flex gap-1.5">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-cyan-500/60" />
                    <span>{l.text}</span>
                  </span>
                ) : (
                  l.text
                )}
              </div>
            ))}
            {busy && (
              <div className="text-cyan-400/60 italic flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                calisiyor...
              </div>
            )}
          </div>

          {/* input */}
          <div className="shrink-0 px-3 py-2 border-t border-cyan-500/20 bg-[#0a0a14] flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") run(input);
              }}
              placeholder="komut yaz... (help)"
              className="flex-1 bg-transparent text-[12px] font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              onClick={() => run(input)}
              disabled={!input.trim() || busy}
              className="p-1 rounded text-cyan-400 hover:bg-cyan-500/10 transition disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
