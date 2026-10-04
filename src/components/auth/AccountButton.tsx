"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, LogOut, ChevronDown, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/nexra";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/nexra";
import { useEscapeKey } from "@/lib/use-escape-key";
import { createPortal } from "react-dom";

export function AccountButton({
  account,
  onOpenAuth,
  onLogout,
  onActivatePremium,
  onActivateSubscription,
}: {
  account: Account | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onActivatePremium: (days: number) => void;
  onActivateSubscription: (tier: SubscriptionTier, days?: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEscapeKey(() => setMenuOpen(false), menuOpen);
  const [btnRef, setBtnRef] = useState<HTMLButtonElement | null>(null);
  const [btnRect, setBtnRect] = useState<{ top: number; right: number; maxHeight: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (menuOpen && btnRef) {
      const r = btnRef.getBoundingClientRect();
      const top = r.bottom + 6;
      const viewportH = window.innerHeight;
      const maxHeight = Math.max(280, viewportH - top - 16);
      setBtnRect({ top: r.bottom + 6, right: window.innerWidth - r.right, maxHeight });
    }
  }, [menuOpen, btnRef]);

  if (!account) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-700/70 text-zinc-300 hover:text-zinc-100 hover:border-violet-500/50 transition text-xs font-mono"
      >
        <span className="hidden sm:inline">giris</span>
        <span className="sm:hidden">+</span>
      </button>
    );
  }

  const premium = account.premium;
  const displayName = account.google?.name || account.username;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isGoogle = !!account.google;

  const dropdown = menuOpen && btnRect ? (
    <div
      className="fixed inset-0 z-[80]"
      onClick={() => setMenuOpen(false)}
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
        className="w-72 overflow-y-auto overscroll-contain rounded-xl border-2 border-violet-500/60 bg-[#1a1a24] shadow-[0_8px_32px_rgba(139,92,246,0.3),0_0_0_1px_rgba(139,92,246,0.2)] nexra-scroll"
      >
        <div className="p-3 border-b border-violet-500/10">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                premium ? "bg-amber-500/30 text-amber-100" : "bg-violet-500/20 text-violet-200"
              )}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-zinc-100 truncate">{displayName}</p>
              <p className="text-[10px] font-mono text-zinc-500 truncate">{account.email}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Subscription badge */}
            <span className={cn(
              "inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border",
              SUBSCRIPTION_TIERS[account.subscription || "none"].color
            )}>
              {account.subscription && account.subscription !== "none" && <Crown className="w-2.5 h-2.5" />}
              {SUBSCRIPTION_TIERS[account.subscription || "none"].label}
              {account.subscriptionUntil && account.subscription !== "none" && (
                <span className="ml-1 opacity-70">
                  {Math.max(0, Math.ceil((account.subscriptionUntil - Date.now()) / 86400000))}g
                </span>
              )}
            </span>
            {isGoogle && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <svg width="8" height="8" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Google
              </span>
            )}
          </div>
        </div>

        {/* Subscription purchase — profile section */}
        <div className="p-3 border-b border-violet-500/10">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> ABONELIK SATIN AL
          </p>
          <div className="space-y-1.5">
            {(["premium", "flagship", "flagship_plus", "agentic", "freedom"] as SubscriptionTier[]).map((tier) => {
              const tm = SUBSCRIPTION_TIERS[tier];
              const current = account.subscription === tier;
              return (
                <button
                  key={tier}
                  onClick={() => {
                    onActivateSubscription(tier, 30);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition",
                    current
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : tm.color + " hover:brightness-125"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold">{tm.label}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{tm.price}</span>
                      {current && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{tm.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            onLogout();
            setMenuOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-mono text-rose-300">cikis yap</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <button
          ref={setBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition text-xs font-mono",
            premium
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              : "border-zinc-700/70 bg-zinc-800/40 text-zinc-300 hover:border-violet-500/50"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
              premium ? "bg-amber-500/30 text-amber-100" : "bg-violet-500/20 text-violet-200"
            )}
          >
            {initials}
          </div>
          <span className="hidden sm:inline max-w-[80px] truncate">{displayName}</span>
          {premium && <Crown className="w-3 h-3 text-amber-400" />}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </div>
      {mounted && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </>
  );
}
