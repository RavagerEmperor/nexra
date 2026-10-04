"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, Sparkles } from "lucide-react";

export function ThinkingPanel({
  thinking,
  modelLabel,
  ultra,
}: {
  thinking: string;
  modelLabel?: string;
  ultra?: boolean;
}) {
  const [open, setOpen] = useState(ultra ? true : false);

  if (!thinking) return null;

  const accent = ultra ? "#6366f1" : "#06b6d4";

  return (
    <div
      className="mb-2 rounded-lg border overflow-hidden"
      style={{
        borderColor: accent + "33",
        background: accent + "0d",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition hover:brightness-125"
      >
        {ultra ? <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} /> : <Brain className="w-3.5 h-3.5" style={{ color: accent }} />}
        <span
          className="text-[11px] font-mono flex-1"
          style={{ color: accent + "cc" }}
        >
          {ultra ? "ultra dusunme izi" : "dusunme izi"}
          {modelLabel ? ` • ${modelLabel}` : ""}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" style={{ color: accent + "99" }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 pt-1 text-[12px] font-mono leading-relaxed whitespace-pre-wrap border-t"
              style={{
                color: accent + "b3",
                borderColor: accent + "22",
              }}
            >
              {thinking}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
