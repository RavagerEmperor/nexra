"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MODEL_MAP, type NexraModelId } from "@/lib/nexra";

const STEPS = [
  "çekirdek başlatılıyor",
  "persona bağlanıyor",
  "model kalibre ediliyor",
  "sinir ağı inşa ediliyor",
  "sinyal kilitleniyor",
  "düşünme katmanı yükleniyor",
  "hafıza senkronize ediliyor",
  "ara ağ inşa ediliyor",
  "dil modeli oturumlanıyor",
  "variant kalibre",
  "sistem hazır",
];

const FACTS: Record<string, string[]> = {
  default: [
    "ultra think modu: 6-katmanlı düşünme süreci",
    "64k token bütçe — sınırsız uzun cevap",
    "15 günlük hafıza — geçmişi hatırlar",
    "web erişimi — gerçek zamanlı araştırma",
    "multi-pass reasoning — düşün → eleştir → rafine",
    "adversarial check — kendi sonucuna karşı argüman",
    "prompt analizi — intent → scope → format",
  ],
};

export function ModelLoader({
  model,
  onClose,
}: {
  model: NexraModelId | null;
  onClose?: () => void;
}) {
  const meta = model ? MODEL_MAP[model] : null;
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [factIdx, setFactIdx] = useState(0);
  const [userClosed, setUserClosed] = useState(false);
  // internal model state — keeps showing even after parent clears switching
  const [internalModel, setInternalModel] = useState<NexraModelId | null>(null);

  const displayMeta = internalModel ? MODEL_MAP[internalModel] : null;
  const facts = (displayMeta && FACTS[displayMeta.id]) || FACTS.default;

  useEffect(() => {
    if (model && !userClosed) {
      setInternalModel(model);
    }
  }, [model, userClosed]);

  useEffect(() => {
    if (!model || userClosed) {
      return;
    }
    setStep(0);
    setProgress(0);
    setFactIdx(0);
    const tierDelay = displayMeta?.tier === "agentic" ? 600 : displayMeta?.tier === "flagship_plus" ? 550 : displayMeta?.tier === "flagship" ? 480 : displayMeta?.tier === "flagship_lite" ? 400 : displayMeta?.tier === "premium" ? 350 : 280;
    const stepInterval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, tierDelay);
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, tierDelay / 6);
    const factInterval = setInterval(() => {
      setFactIdx((i) => (i + 1) % facts.length);
    }, 2000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(factInterval);
    };
  }, [model, displayMeta?.tier, userClosed, facts.length]);

  // reset userClosed when model changes to a NEW model
  useEffect(() => {
    if (model && model !== internalModel) {
      setUserClosed(false);
    }
  }, [model, internalModel]);

  const handleClose = () => {
    setUserClosed(true);
    setInternalModel(null);
    onClose?.();
  };

  const show = displayMeta && !userClosed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0a0a0f]/97 backdrop-blur-2xl overflow-hidden"
        >
          {/* animated cortex grid background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(${displayMeta.accent}20 1px, transparent 1px), linear-gradient(90deg, ${displayMeta.accent}20 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse at center, black 10%, transparent 75%)",
              animation: "cortexShift 8s linear infinite",
            }}
          />

          {/* cortex pulse rings — expanding from center */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              aria-hidden
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut",
              }}
              className="absolute w-32 h-32 rounded-full border-2"
              style={{ borderColor: displayMeta.accent }}
            />
          ))}

          {/* explosion particles — primary wave */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const dist = 100 + Math.random() * 80;
            return (
              <motion.div
                key={`particle-${i}`}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: [0, 1, 0],
                  scale: [0, 2, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.08,
                  ease: "easeOut",
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: displayMeta.accent,
                  boxShadow: `0 0 16px ${displayMeta.accent}`,
                }}
              />
            );
          })}
          {/* secondary particle wave — smaller, faster */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2 + 0.3;
            const dist = 60 + Math.random() * 40;
            return (
              <motion.div
                key={`spark-${i}`}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.05 + 0.5,
                  ease: "easeOut",
                }}
                className="absolute w-1 h-1 rounded-full"
                style={{ background: displayMeta.accent }}
              />
            );
          })}
          {/* vortex swirl — rotating arc */}
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute w-48 h-48 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${displayMeta.accent}40, transparent)`,
              maskImage: "radial-gradient(circle, transparent 40%, black 45%, transparent 60%)",
            }}
          />

          {/* scan line */}
          <motion.div
            aria-hidden
            initial={{ y: "-100%" }}
            animate={{ y: "100vh" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${displayMeta.accent}, transparent)` }}
          />

          {/* close button — top right */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-rose-300 hover:border-rose-500/50 transition flex items-center justify-center"
            title="Yüklemeyi kapat"
          >
            <X className="w-4 h-4" />
          </button>

          <motion.div
            initial={{ scale: 0.9, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 5, opacity: 0 }}
            className="relative flex flex-col items-center text-center px-8 max-w-md"
          >
            {/* pulsing logo with triple rings + core */}
            <div className="relative mb-8">
              <div
                className="absolute inset-0 blur-3xl rounded-full opacity-80"
                style={{ background: displayMeta.accent }}
              />
              {/* outer explosion ring */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: displayMeta.accent }}
              />
              {/* outer ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="relative w-28 h-28 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: displayMeta.accent + "40" }}
              >
                {/* middle ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute w-20 h-20 rounded-full border"
                  style={{ borderColor: displayMeta.accent + "60", borderStyle: "dashed" }}
                />
                {/* inner ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute w-12 h-12 rounded-full border"
                  style={{ borderColor: displayMeta.accent + "80" }}
                />
                {/* core */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${displayMeta.accent}, ${displayMeta.accent}40)`,
                    boxShadow: `0 0 40px ${displayMeta.accent}, 0 0 80px ${displayMeta.accent}80`,
                  }}
                />
              </motion.div>
            </div>

            {/* model info */}
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 mb-1"
            >
              MODEL DEĞİŞTİRİLİYOR
            </motion.p>
            <h3 className="text-2xl font-bold mb-1" style={{ color: displayMeta.accent }}>
              {displayMeta.label}
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                {displayMeta.version}
              </span>
              <span className="text-[10px] font-mono text-zinc-600">
                {displayMeta.tier}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mb-2 max-w-xs leading-relaxed">
              {displayMeta.desc}
            </p>

            {/* rotating fact */}
            <motion.div
              key={factIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-mono text-zinc-600 mb-4 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/40"
            >
              ℹ {facts[factIdx]}
            </motion.div>

            {/* progress bar */}
            <div className="w-64 h-1 rounded-full bg-zinc-800 overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${displayMeta.accent}80, ${displayMeta.accent})` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* progress steps */}
            <div className="space-y-1 w-64">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: i <= step ? 1 : 0.15 }}
                  className="flex items-center gap-2 text-[11px] font-mono"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: i < step ? displayMeta.accent : i === step ? displayMeta.accent : "rgba(255,255,255,0.1)",
                      animation: i === step ? `loaderPulse 0.8s infinite` : "none",
                      boxShadow: i <= step ? `0 0 8px ${displayMeta.accent}` : "none",
                    }}
                  />
                  <span style={{ color: i <= step ? displayMeta.accent : "rgba(255,255,255,0.3)" }}>
                    {s}
                  </span>
                  {i < step && i < STEPS.length - 1 && (
                    <span className="ml-auto text-[9px]" style={{ color: displayMeta.accent + "80" }}>✓</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
          <style>{`
            @keyframes loaderPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.6); opacity: 0.5; }
            }
            @keyframes cortexShift {
              0% { background-position: 0 0; }
              100% { background-position: 28px 28px; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
