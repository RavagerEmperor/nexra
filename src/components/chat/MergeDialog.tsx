"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Plus, Check, Zap, Sparkles, Crown, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODELS,
  MODEL_MAP,
  MERGE_STRATEGIES,
  type NexraModelId,
  type MergeStrategy,
} from "@/lib/nexra";
import { useEscapeKey } from "@/lib/use-escape-key";

const ICONS: Partial<Record<string, React.ElementType>> = {
  flash: Zap,
  standard: Sparkles,
  reasoner: Brain,
  ultra: Brain,
  prime: Crown,
  zero: Crown,
};

function iconFor(id: NexraModelId) {
  return ICONS[id] || Sparkles;
}

export function MergeDialog({
  open,
  onClose,
  onMerge,
}: {
  open: boolean;
  onClose: () => void;
  onMerge: (models: NexraModelId[], strategy: MergeStrategy, name: string) => void;
}) {
  const [selected, setSelected] = useState<NexraModelId[]>([]);
  const [strategy, setStrategy] = useState<MergeStrategy>("cascade");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEscapeKey(onClose, open);

  const toggle = useCallback((id: NexraModelId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const handleMerge = () => {
    if (selected.length < 2 || busy) return;
    setBusy(true);
    const finalName =
      name.trim() ||
      selected.map((id) => MODEL_MAP[id].tag).join("+");
    onMerge(selected, strategy, finalName);
    setTimeout(() => {
      setBusy(false);
      setSelected([]);
      setName("");
      onClose();
    }, 500);
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-violet-500/30 bg-[#0c0c14] shadow-2xl"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="relative p-5 border-b border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-transparent">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Model Birlestir</h2>
                  <p className="text-[11px] font-mono text-zinc-500">
                    2-4 varyant birlestir. ultra sentez uretilir.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Strategy */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  strateji
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(Object.keys(MERGE_STRATEGIES) as MergeStrategy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-xs font-mono transition",
                        strategy === s
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                          : "border-zinc-700/70 text-zinc-400 hover:border-violet-500/40"
                      )}
                    >
                      {MERGE_STRATEGIES[s].label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-zinc-600 mt-1.5">
                  {MERGE_STRATEGIES[strategy].desc}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  merge model adi (opsiyonel)
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selected.length >= 2 ? selected.map((id) => MODEL_MAP[id].tag).join("+") : "ULTRA MERGE"}
                  className="mt-1 w-full px-3 py-2 rounded-md bg-[#13131a] border border-zinc-700/70 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
                />
              </div>

              {/* Model selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    varyantlar ({selected.length}/4)
                  </label>
                  {selected.length < 2 && (
                    <span className="text-[10px] font-mono text-amber-400/70">en az 2 gerekli</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto p-0.5" style={{ scrollbarWidth: "thin" }}>
                  {MODELS.map((m) => {
                    const Icon = iconFor(m.id);
                    const active = selected.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        disabled={!active && selected.length >= 4}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition disabled:opacity-30",
                          active
                            ? "border-violet-500/60 bg-violet-500/15"
                            : "border-zinc-800 hover:border-zinc-700"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: m.accent }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-zinc-200 truncate">
                            {m.label.replace("NEXRA ", "")}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-600">{m.version}</p>
                        </div>
                        {active && <Check className="w-3 h-3 text-violet-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected preview */}
              {selected.length >= 2 && (
                <div className="px-3 py-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5">
                  <p className="text-[10px] font-mono text-violet-400/70 mb-1">BIRLESTIRME ONIZLEME</p>
                  <p className="text-sm font-mono text-violet-200">
                    {selected.map((id) => MODEL_MAP[id].label.replace("NEXRA ", "")).join(" + ")}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    strateji: {MERGE_STRATEGIES[strategy].label}
                  </p>
                </div>
              )}

              <button
                onClick={handleMerge}
                disabled={selected.length < 2 || busy}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-mono transition disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_-2px_rgba(139,92,246,0.5)]"
              >
                {busy ? "olusturuluyor..." : "ULTRA MERGE OLUSTUR"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
