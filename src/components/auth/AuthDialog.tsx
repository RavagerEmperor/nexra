"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Crown, Zap, Clock, Brain, Check } from "lucide-react";
import type { Account, GoogleProfile } from "@/lib/nexra";
import { getGoogleDemoAccounts } from "@/lib/nexra";
import { useEscapeKey } from "@/lib/use-escape-key";

export function AuthDialog({
  open,
  onClose,
  mode,
  setMode,
  onSignup,
  onLogin,
  onActivatePremium,
  onLoginWithGoogle,
  account,
  googleAvailable,
}: {
  open: boolean;
  onClose: () => void;
  mode: "login" | "signup";
  setMode: (m: "login" | "signup") => void;
  onSignup: (email: string, username: string, password: string) => { ok: boolean; error?: string };
  onLogin: (email: string, password: string) => { ok: boolean; error?: string };
  onActivatePremium: (days: number) => void;
  onLoginWithGoogle: (profile: GoogleProfile) => { ok: boolean; error?: string };
  account: Account | null;
  googleAvailable: boolean;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleStep, setGoogleStep] = useState<"none" | "picker" | "loading">("none");
  useEscapeKey(onClose, open);

  const submit = () => {
    setBusy(true);
    setError(null);
    const res =
      mode === "signup"
        ? onSignup(email, username, password)
        : onLogin(email, password);
    setBusy(false);
    if (res.ok) {
      onClose();
      setEmail("");
      setUsername("");
      setPassword("");
    } else {
      setError(res.error || "hata");
    }
  };

  const handleGooglePick = (profile: GoogleProfile) => {
    setGoogleStep("loading");
    setTimeout(() => {
      const res = onLoginWithGoogle(profile);
      if (res.ok) {
        setGoogleStep("none");
        onClose();
      } else {
        setError(res.error || "google giris hatasi");
        setGoogleStep("none");
      }
    }, 1200);
  };

  const googleAccounts = getGoogleDemoAccounts();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
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
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">
                    {mode === "signup" ? "Hesap olustur" : "Giris yap"}
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-500">
                    premium varyantlar + 15 gunluk hafiza
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {error && (
                <div className="px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-[12px] text-rose-300 font-mono">
                  {error}
                </div>
              )}

              {/* Google ile giris */}
              {googleStep === "none" && (
                <>
                  <button
                    onClick={() => {
                      if (googleAvailable) {
                        // real OAuth — redirect to Google consent
                        window.location.href = "/api/auth/google?action=login";
                      } else {
                        // demo fallback
                        setGoogleStep("picker");
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-zinc-600 bg-white hover:bg-zinc-100 text-zinc-800 text-sm font-medium transition shadow-sm hover:shadow-md"
                  >
                    <GoogleGIcon />
                    <span>Google ile giris yap</span>
                    {!googleAvailable && (
                      <span className="text-[9px] font-mono text-zinc-500 ml-1 px-1.5 py-0.5 rounded bg-zinc-200">
                        demo
                      </span>
                    )}
                  </button>
                  {!googleAvailable && (
                    <p className="text-[9px] font-mono text-zinc-600 text-center -mt-1">
                      gerçek google icin .env'e GOOGLE_CLIENT_ID/SECRET ekle
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-zinc-700/50" />
                    <span className="text-[10px] font-mono text-zinc-600">veya</span>
                    <div className="flex-1 h-px bg-zinc-700/50" />
                  </div>
                </>
              )}

              {/* Google hesap secici */}
              {googleStep === "picker" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-mono text-zinc-400">
                    Bir Google hesabi secin:
                  </p>
                  {googleAccounts.map((g) => (
                    <button
                      key={g.sub}
                      onClick={() => handleGooglePick(g)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-700/70 hover:border-violet-500/50 hover:bg-zinc-800/40 transition text-left"
                    >
                      <GoogleAvatar name={g.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-100 truncate">{g.name}</p>
                        <p className="text-[11px] font-mono text-zinc-500 truncate">{g.email}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setGoogleStep("none")}
                    className="w-full text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition pt-1"
                  >
                    geri
                  </button>
                </div>
              )}

              {/* Google loading */}
              {googleStep === "loading" && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400"
                  />
                  <p className="text-[11px] font-mono text-zinc-400">
                    Google bilgileri yukleniyor...
                  </p>
                </div>
              )}

              {/* Standart form */}
              {googleStep === "none" && (
                <>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      e-posta
                    </label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="operator@nexra.io"
                        className="w-full pl-9 pr-3 py-2 rounded-md bg-[#13131a] border border-zinc-700/70 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  {mode === "signup" && (
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                        kullanici adi
                      </label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="operator"
                          className="w-full pl-9 pr-3 py-2 rounded-md bg-[#13131a] border border-zinc-700/70 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      sifre
                    </label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder="••••"
                        className="w-full pl-9 pr-3 py-2 rounded-md bg-[#13131a] border border-zinc-700/70 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={submit}
                    disabled={busy}
                    className="w-full py-2.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-mono transition disabled:opacity-50"
                  >
                    {busy ? "..." : mode === "signup" ? "kayit ol" : "giris yap"}
                  </button>

                  <div className="text-center">
                    <button
                      onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                      className="text-[11px] font-mono text-zinc-500 hover:text-violet-300 transition"
                    >
                      {mode === "signup" ? "zaten hesap var? giris yap" : "hesap yok? kayit ol"}
                    </button>
                  </div>
                </>
              )}

              {/* premium upsell */}
              {googleStep === "none" && (
                <div className="mt-4 pt-4 border-t border-violet-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[11px] font-mono text-amber-300">PREMIUM</p>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400/70" />
                      <span>NEXRA Coder, Vision, Edge</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3 h-3 text-amber-400/70" />
                      <span>NEXRA Ultra Think (2s kilit)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-400/70" />
                      <span>NEXRA Prime (6s kilit, agent)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400/70" />
                      <span>Zaman kilitli amiral gemileri</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onActivatePremium(30)}
                    disabled={!account}
                    className="mt-3 w-full py-2 rounded-md bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/40 text-amber-200 text-[12px] font-mono hover:from-amber-500/30 hover:to-amber-500/10 transition disabled:opacity-40"
                  >
                    {account?.premium ? "PREMIUM AKTIF (30 gun uzat)" : "30 gun premium dene (demo)"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleGIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function GoogleAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // deterministic color from name
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: `hsl(${hue} 60% 50%)` }}
    >
      {initials}
    </div>
  );
}

// silence unused import warning
void Check;
