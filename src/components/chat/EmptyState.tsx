"use client";

import { motion } from "framer-motion";
import { Terminal, Zap, Sparkles, Brain, Search, Crown, Code, Eye, Feather, Flame, Gamepad2 } from "lucide-react";
import { MODELS, MODEL_MAP } from "@/lib/nexra";

const SUGGESTIONS = [
  { t: "oyun: yılan — klasik snake", d: "prime · oyun yapma", icon: Gamepad2, model: "prime" as const },
  { t: "kod: hesap makinesi", d: "prime · kodlama", icon: Code, model: "prime" as const },
  { t: "oyun: uzay gemisi shooter", d: "prime · oyun yapma", icon: Gamepad2, model: "prime" as const },
  { t: "karmasik bir matematik problemini adim adim coz", d: "reasoner", icon: Brain, model: "reasoner" as const },
];

const ICONS: Record<string, React.ElementType> = {
  flash: Zap,
  lite: Feather,
  standard: Sparkles,
  reasoner: Brain,
  deep: Search,
  coder: Code,
  vision: Eye,
  ultra: Brain,
  edge: Flame,
  prime: Crown,
};

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-10 sm:py-16"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-violet-600/40 rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center">
          <Terminal className="w-7 h-7 text-violet-300" />
        </div>
      </div>
      <p className="font-mono text-xs text-violet-300/80 tracking-widest mb-2">
        [NEXRA] signal locked. operator detected.
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">NEXRA</h2>
      <p className="text-sm text-zinc-400 max-w-md font-mono mb-8">
        10 varyant. ultra think. agent terminal. 15 gunluk hafiza. hepsi nexra.
      </p>

      {/* model strip */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-8 max-w-2xl">
        {MODELS.map((m) => {
          const Icon = ICONS[m.id] || Sparkles;
          return (
            <span
              key={m.id}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-mono"
              style={{
                color: m.accent,
                borderColor: m.accent + "40",
                background: m.accent + "10",
              }}
            >
              <Icon className="w-2.5 h-2.5" />
              {m.tag}
              {m.tier !== "free" && <Crown className="w-2 h-2 opacity-70" />}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          const meta = MODEL_MAP[s.model];
          return (
            <button
              key={s.t}
              onClick={() => onPick(s.t)}
              className="text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/40 hover:bg-violet-500/5 transition group"
            >
              <Icon className="w-4 h-4 mb-2" style={{ color: meta.accent }} />
              <div className="text-xs text-zinc-300 group-hover:text-violet-200 leading-snug">
                {s.t}
              </div>
              <div className="text-[10px] font-mono text-zinc-600 mt-1 uppercase tracking-wider">
                {s.d}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
