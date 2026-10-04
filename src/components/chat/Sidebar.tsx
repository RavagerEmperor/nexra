"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Terminal,
  Zap,
  Crown,
  Brain,
  Database,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_CHATS, MODEL_MAP, type Chat, type Account } from "@/lib/nexra";

export function Sidebar({
  chats,
  activeId,
  canCreate,
  onNew,
  onSelect,
  onDelete,
  onClose,
  open,
  account,
  memoryCount,
  onOpenTerminal,
  isPrime,
}: {
  chats: Chat[];
  activeId: string | null;
  canCreate: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  open: boolean;
  account: Account | null;
  memoryCount: number;
  onOpenTerminal: () => void;
  isPrime: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed md:relative z-40 md:z-auto top-0 left-0 h-full w-72 shrink-0 border-r border-violet-500/15 bg-[#08080c] flex flex-col"
          >
            {/* brand */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-violet-500/15">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-violet-300" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 ring-2 ring-[#08080c] animate-pulse" />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-100">
                    NEXRA
                  </p>
                  <p className="text-[9px] font-mono text-zinc-600 -mt-0.5">
                    {account?.premium ? "premium build" : "operator build"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* new chat */}
            <div className="p-3">
              <button
                onClick={onNew}
                disabled={!canCreate}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-mono transition",
                  canCreate
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-700/50"
                )}
              >
                <Plus className="w-4 h-4" />
                Yeni Sohbet
              </button>
              {!canCreate && (
                <p className="text-[10px] font-mono text-zinc-600 mt-1.5 text-center">
                  limit: {MAX_CHATS} sohbet
                </p>
              )}
            </div>

            {/* chat list */}
            <div
              className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {chats.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-[11px] font-mono text-zinc-600">henüz sohbet yok</p>
                </div>
              ) : (
                chats.map((c) => {
                  const meta = MODEL_MAP[c.model];
                  const active = c.id === activeId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        "group relative px-3 py-2.5 rounded-lg cursor-pointer transition border",
                        active
                          ? "bg-violet-500/10 border-violet-500/40"
                          : "border-transparent hover:bg-zinc-800/40 hover:border-zinc-700/40"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare
                          className={cn(
                            "w-3.5 h-3.5 mt-0.5 shrink-0",
                            active ? "text-violet-300" : "text-zinc-600"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs truncate",
                              active ? "text-zinc-100" : "text-zinc-400"
                            )}
                          >
                            {c.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded border"
                              style={{
                                color: meta.accent,
                                borderColor: meta.accent + "40",
                                background: meta.accent + "15",
                              }}
                            >
                              {meta.tag}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-600">
                              {c.messages.length} msg
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c.id);
                          }}
                          className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* agent terminal button */}
            <div className="p-3 border-t border-violet-500/10 space-y-2">
              {isPrime && (
                <button
                  onClick={onOpenTerminal}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition group"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-mono text-cyan-300/80 group-hover:text-cyan-200">
                    Agent Terminal
                  </span>
                </button>
              )}

              {/* account profile card */}
              {account && (
                <div className="px-2.5 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        account.premium
                          ? "bg-amber-500/30 text-amber-100"
                          : "bg-violet-500/20 text-violet-200"
                      )}
                    >
                      {(account.google?.name || account.username)
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-zinc-200 truncate">
                        {account.google?.name || account.username}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-600 truncate flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" />
                        {account.email}
                      </p>
                    </div>
                    {account.premium && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                  </div>
                </div>
              )}

              {/* status row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                    <Crown className="w-2.5 h-2.5" />
                    tier
                  </div>
                  <p
                    className={cn(
                      "text-[10px] font-mono mt-0.5",
                      account?.premium ? "text-amber-300" : "text-zinc-400"
                    )}
                  >
                    {account?.premium ? "PREMIUM" : "FREE"}
                  </p>
                </div>
                <div className="px-2 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                    <Database className="w-2.5 h-2.5" />
                    hafiza
                  </div>
                  <p className="text-[10px] font-mono mt-0.5 text-violet-300">
                    {memoryCount} kayit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600">
                <Zap className="w-3 h-3 text-violet-500/60" />
                <span>{chats.length}/{MAX_CHATS} sohbet • 15g hafiza</span>
                {isPrime && <Brain className="w-3 h-3 text-rose-400/60 ml-auto" />}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
