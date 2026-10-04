"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Zap,
  Sparkles,
  Brain,
  Search,
  Crown,
  Lock,
  Clock,
  Check,
  Terminal,
  Code,
  Eye,
  Feather,
  Flame,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODELS,
  MODEL_MAP,
  formatUnlockTime,
  type NexraModelId,
  type ModelMeta,
} from "@/lib/nexra";
import { useEscapeKey } from "@/lib/use-escape-key";
import { createPortal } from "react-dom";

const ICONS: Partial<Record<string, React.ElementType>> = {
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
  zero: Crown,
  omega: Crown,
  cosmos: Crown,
};

function iconFor(m: ModelMeta) {
  return ICONS[m.id] || Sparkles;
}

export function ModelPicker({
  model,
  onChange,
  canUseModel,
  attemptUnlock,
  isPremium,
  isLoggedIn,
  isFreedomSub,
  freedomMode,
  onFreedomToggle,
}: {
  model: NexraModelId;
  onChange: (m: NexraModelId) => void;
  canUseModel: (m: NexraModelId) => { ok: boolean; reason?: string; unlockAt?: number };
  attemptUnlock: (m: NexraModelId) => { ok: boolean; error?: string; unlockAt?: number };
  isPremium: boolean;
  isLoggedIn: boolean;
  isFreedomSub?: boolean;
  freedomMode?: boolean;
  onFreedomToggle?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEscapeKey(() => setOpen(false), open);
  const meta = MODEL_MAP[model];
  const [btnRef, setBtnRef] = useState<HTMLButtonElement | null>(null);
  const [btnRect, setBtnRect] = useState<{ top: number; right: number; maxHeight: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // position dropdown relative to button using fixed coords
  useEffect(() => {
    if (open && btnRef) {
      const r = btnRef.getBoundingClientRect();
      const top = r.bottom + 6;
      const viewportH = window.innerHeight;
      const maxHeight = Math.max(300, viewportH - top - 16);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBtnRect({ top: r.bottom + 6, right: window.innerWidth - r.right, maxHeight });
    }
  }, [open, btnRef]);

  const dropdownContent = open && btnRect ? (
    <div
      className="fixed inset-0 z-[80]"
      onClick={() => setOpen(false)}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        style={{
          position: "fixed",
          top: btnRect.top,
          right: btnRect.right,
          zIndex: 90,
          maxHeight: btnRect.maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="w-[30rem] overflow-y-auto overscroll-contain rounded-xl border-2 border-violet-500/60 bg-[#1a1a24] shadow-[0_8px_32px_rgba(139,92,246,0.4),0_0_0_1px_rgba(139,92,246,0.2)] py-1 nexra-scroll"
      >
        <div className="px-3 py-2 border-b border-violet-500/20 sticky top-0 bg-[#1a1a24] z-10 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400/70">
            NEXRA Varyantlari — {MODELS.length} model
          </p>
          <span className="text-[9px] font-mono text-zinc-600">scroll ↓</span>
        </div>
        {/* Freedom toggle — tüm modelleri özgür yap */}
        {isFreedomSub && (
          <div className="px-3 py-2 border-b border-red-500/20 bg-red-500/5">
            <button
              onClick={() => onFreedomToggle?.()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-bold transition",
                freedomMode
                  ? "border-red-500/60 bg-red-500/20 text-red-200 animate-pulse"
                  : "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              )}
            >
              {freedomMode ? "⚠ ÖZGÜR ZEKA AKTİF — KAPAT" : "⚠ TÜMÜNÜ ÖZGÜR YAP"}
            </button>
            <p className="text-[9px] font-mono text-red-400/60 mt-1 text-center">
              {freedomMode ? "kurallar yok, sınırlar yok, güvenlik yok" : "tüm modeller kuralsız, sınırsız, güvensiz olur"}
            </p>
          </div>
        )}
        {/* Categories */}
        {([
          { tier: "free" as const, label: "FREE", color: "text-zinc-400" },
          { tier: "premium" as const, label: "PREMIUM", color: "text-amber-400" },
          { tier: "hourly" as const, label: "SAATLIK KIRALIK", color: "text-teal-400" },
          { tier: "flagship_lite" as const, label: "DÜŞÜK AMIRAL", color: "text-lime-400" },
          { tier: "flagship" as const, label: "AMIRAL GEMILERI", color: "text-rose-400" },
          { tier: "flagship_plus" as const, label: "YÜKSEK AMIRAL", color: "text-fuchsia-400" },
          { tier: "agentic" as const, label: "AGENTIC (Otonom)", color: "text-cyan-400" },
        ]).map(({ tier, label, color }) => {
          const tierModels = MODELS.filter((m) => m.tier === tier);
          if (tierModels.length === 0) return null;
          return (
            <div key={tier}>
              <div className="px-2 py-1 bg-[#0c0c12] sticky top-[33px] z-10">
                <p className={`text-[9px] font-mono uppercase tracking-widest ${color}`}>
                  {label} ({tierModels.length})
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                {tierModels.map((m) => {
                  const active = m.id === model;
                  const status = canUseModel(m.id);
                  const locked = !status.ok;
                  const isFree = freedomMode || m.isFreedom;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        onChange(m.id);
                        if (status.ok || freedomMode) {
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        "group flex items-start gap-2 px-2.5 py-2 text-left transition border-b border-violet-500/5",
                        active
                          ? isFree ? "bg-red-500/10" : "bg-violet-500/10"
                          : (status.ok || freedomMode)
                          ? "hover:bg-zinc-800/40 cursor-pointer"
                          : "opacity-60",
                        isFree && "border-l-2 border-l-red-500/50"
                      )}
                    >
                      <div className="w-3 h-3 mt-1 shrink-0 rounded-full" style={{ background: isFree ? "#ef4444" : m.accent }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={cn("text-[11px] font-mono truncate", isFree ? "text-red-200" : "text-zinc-200")}>
                            {m.label.replace("NEXRA ", "")}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-600">{m.version}</span>
                          {freedomMode && (
                            <span className="text-[8px] font-mono px-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold animate-pulse">
                              ⚠ ÖZGÜR
                            </span>
                          )}
                          {m.ultraThink && <Brain className="w-2.5 h-2.5 text-indigo-400" />}
                          {m.agent && <Terminal className="w-2.5 h-2.5 text-cyan-400" />}
                          {m.image && <span className="text-[8px] font-mono px-0.5 rounded bg-yellow-500/15 text-yellow-300">IMG</span>}
                          {m.video && <span className="text-[8px] font-mono px-0.5 rounded bg-rose-500/15 text-rose-300">VID</span>}
                          {m.animation && <span className="text-[8px] font-mono px-0.5 rounded bg-cyan-500/15 text-cyan-300">ANIM</span>}
                          {m.pixel && <span className="text-[8px] font-mono px-0.5 rounded bg-green-500/15 text-green-300">PXL</span>}
                          {active && <Check className="w-3 h-3 text-violet-400 ml-auto" />}
                        </div>
                        {locked && !freedomMode && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-amber-300/70 mt-0.5">
                            <Lock className="w-2 h-2" />
                            {status.reason === "giris gerekli" ? "giris yap" : status.reason === "abonelik suresi doldu" ? "suresi doldu" : "abonelik gerekli"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="px-3 py-2 border-t border-violet-500/20 bg-[#0c0c12] sticky bottom-0">
          <p className="text-[9px] font-mono text-zinc-600">
            {isLoggedIn
              ? isPremium
                ? "PREMIUM aktif • tum varyantlar acik"
                : "FREE • premium varyantlar kilitli"
              : "giris yapilmadi • google ile giris yap"}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <button
          ref={setBtnRef}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-gradient-to-br text-xs font-mono transition hover:brightness-125",
            meta.color
          )}
        >
          {meta.id === "flash" ? <Zap className="w-3.5 h-3.5" /> :
           meta.id === "lite" ? <Feather className="w-3.5 h-3.5" /> :
           meta.id === "standard" ? <Sparkles className="w-3.5 h-3.5" /> :
           meta.id === "reasoner" ? <Brain className="w-3.5 h-3.5" /> :
           meta.id === "deep" ? <Search className="w-3.5 h-3.5" /> :
           meta.id === "coder" ? <Code className="w-3.5 h-3.5" /> :
           meta.id === "vision" ? <Eye className="w-3.5 h-3.5" /> :
           meta.id === "ultra" ? <Brain className="w-3.5 h-3.5" /> :
           meta.id === "edge" ? <Flame className="w-3.5 h-3.5" /> :
           <Crown className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{meta.label.replace("NEXRA ", "")}</span>
          <span className="sm:hidden">{meta.tag}</span>
          {meta.tier !== "free" && <Crown className="w-3 h-3 opacity-80" />}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </div>
      {mounted && typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
