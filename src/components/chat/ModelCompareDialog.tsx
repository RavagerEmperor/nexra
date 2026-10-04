"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Swords, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS, MODEL_MAP, type NexraModelId } from "@/lib/nexra";
import { useEscapeKey } from "@/lib/use-escape-key";

type CompareResult = {
  model: string;
  reply: string;
}[];

export function ModelCompareDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<NexraModelId[]>([]);
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<CompareResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<string>("all");
  useEscapeKey(onClose, open);

  const toggle = (id: NexraModelId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const run = async () => {
    if (selected.length < 2 || !prompt.trim() || busy) return;
    setBusy(true);
    setResults(null);
    try {
      const res = await Promise.all(
        selected.map(async (id) => {
          const meta = MODEL_MAP[id];
          const r = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: id,
              messages: [{ role: "user", content: prompt }],
            }),
          });
          const data = await r.json();
          return { model: meta.label, reply: data.reply || "[hata]" };
        })
      );
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-violet-500/30 bg-[#0c0c14] shadow-2xl"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="relative p-5 border-b border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-transparent">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Model Kapistir</h2>
                  <p className="text-[11px] font-mono text-zinc-500">2-3 modeli ayni soruyla karsilastir</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Prompt */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">soru</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  placeholder="ornek: felsefe nedir?"
                  className="mt-1 w-full px-3 py-2 rounded-md bg-[#13131a] border border-zinc-700/70 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none resize-none"
                />
              </div>

              {/* Category filter */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">kategori filtre</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {([
                    { id: "all", label: "TUM" },
                    { id: "chat", label: "SOHBET" },
                    { id: "code", label: "KOD" },
                    { id: "image", label: "GORSEL" },
                    { id: "video", label: "VIDEO" },
                    { id: "agent", label: "AGENT" },
                    { id: "research", label: "ARASTIRMA" },
                  ] as const).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-mono transition",
                        category === cat.id
                          ? "bg-violet-500/20 text-violet-200 border border-violet-500/40"
                          : "bg-zinc-800/40 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model selection — filtered by category */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  modeller ({selected.length}/3) — ayni kategoriden sec
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {MODELS.filter((m) => {
                    if (category === "all") return true;
                    if (category === "code") return m.capabilities.includes("reasoning") && !m.image && !m.video;
                    if (category === "image") return m.image;
                    if (category === "video") return m.video;
                    if (category === "agent") return m.agent;
                    if (category === "research") return m.research;
                    if (category === "chat") return !m.image && !m.video && !m.agent;
                    return true;
                  }).map((m) => {
                    const active = selected.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        disabled={!active && selected.length >= 3}
                        className={cn(
                          "px-2 py-1.5 rounded-md border text-[11px] font-mono transition disabled:opacity-30 truncate",
                          active
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                            : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
                        )}
                      >
                        {m.label.replace("NEXRA ", "")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={run}
                disabled={selected.length < 2 || !prompt.trim() || busy}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-mono transition disabled:opacity-30 shadow-[0_0_20px_-2px_rgba(139,92,246,0.5)]"
              >
                {busy ? "karsilastiriliyor..." : "KAPISTIR"}
              </button>

              {/* Results */}
              {results && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {results.map((r, i) => {
                    const meta = selected[i] ? MODEL_MAP[selected[i]] : null;
                    if (!meta) return null;
                    return (
                      <div
                        key={i}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor: meta.accent + "40",
                          background: meta.accent + "08",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-3 h-3" style={{ color: meta.accent }} />
                          <span className="text-[11px] font-mono" style={{ color: meta.accent }}>
                            {r.model}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-600 ml-auto">{meta.version}</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                          {r.reply.replace(/^\[NEXRA\]\s*\n?/i, "").slice(0, 600)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
