"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Zap, Brain, Database, Globe, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/lib/use-escape-key";

export type NexraSettings = {
  language: "auto" | "tr" | "en";
  autoMemory: boolean;
  longResponses: boolean;
  webAccess: boolean;
  fontSize: "sm" | "md" | "lg";
  scanlines: boolean;
  glow: boolean;
};

export const DEFAULT_SETTINGS: NexraSettings = {
  language: "auto",
  autoMemory: true,
  longResponses: true,
  webAccess: true,
  fontSize: "md",
  scanlines: true,
  glow: true,
};

export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  memoryCount,
  onClearMemory,
}: {
  open: boolean;
  onClose: () => void;
  settings: NexraSettings;
  onChange: (s: NexraSettings) => void;
  memoryCount: number;
  onClearMemory: () => void;
}) {
  const update = (patch: Partial<NexraSettings>) => onChange({ ...settings, ...patch });
  useEscapeKey(onClose, open);

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
            className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-[#0c0c14] shadow-2xl overflow-hidden"
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
                  <Settings className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Ayarlar</h2>
                  <p className="text-[11px] font-mono text-zinc-500">nexra konfigurasyonu</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Language */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> dil
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["auto", "tr", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => update({ language: l })}
                      className={cn(
                        "px-3 py-2 rounded-md border text-xs font-mono transition",
                        settings.language === l
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                          : "border-zinc-700/70 text-zinc-400 hover:border-violet-500/40"
                      )}
                    >
                      {l === "auto" ? "oto" : l === "tr" ? "turkce" : "english"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <Toggle
                icon={Brain}
                label="otomatik hafiza"
                desc="operator mesajlarini kaydet"
                value={settings.autoMemory}
                onChange={(v) => update({ autoMemory: v })}
              />
              <Toggle
                icon={Zap}
                label="uzun cevaplar"
                desc="64k token bütçe"
                value={settings.longResponses}
                onChange={(v) => update({ longResponses: v })}
              />
              <Toggle
                icon={Globe}
                label="web erisimi"
                desc="ara modelleri web arastirir"
                value={settings.webAccess}
                onChange={(v) => update({ webAccess: v })}
              />
              <Toggle
                icon={Crown}
                label="glow efektleri"
                desc="siberpunk parilti"
                value={settings.glow}
                onChange={(v) => update({ glow: v })}
              />
              <Toggle
                icon={Zap}
                label="scanline animasyonu"
                desc="header tarama cizgisi"
                value={settings.scanlines}
                onChange={(v) => update({ scanlines: v })}
              />

              {/* Font size */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  font boyutu
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["sm", "md", "lg"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => update({ fontSize: f })}
                      className={cn(
                        "px-3 py-2 rounded-md border text-xs font-mono transition",
                        settings.fontSize === f
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                          : "border-zinc-700/70 text-zinc-400 hover:border-violet-500/40"
                      )}
                    >
                      {f === "sm" ? "kucuk" : f === "md" ? "orta" : "buyuk"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory */}
              <div className="pt-3 border-t border-violet-500/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[11px] font-mono text-zinc-300">hafiza</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{memoryCount} kayit</span>
                </div>
                <button
                  onClick={onClearMemory}
                  disabled={memoryCount === 0}
                  className="w-full py-2 rounded-md border border-rose-500/30 text-rose-300 text-[11px] font-mono hover:bg-rose-500/10 transition disabled:opacity-30"
                >
                  hafizayi temizle
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({
  icon: Icon,
  label,
  desc,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono text-zinc-200">{label}</p>
        <p className="text-[10px] text-zinc-600">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-9 h-5 rounded-full transition shrink-0",
          value ? "bg-violet-600" : "bg-zinc-700"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white",
            value ? "left-4" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
