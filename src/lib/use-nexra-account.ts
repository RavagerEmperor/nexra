"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadAccounts,
  saveAccounts,
  loadSession,
  saveSession,
  clearSession,
  hashPwd,
  uid,
  makeGoogleProfile,
  SUBSCRIPTION_TIERS,
  type Account,
  type Session,
  type GoogleProfile,
  type NexraModelId,
  type SubscriptionTier,
  MODEL_MAP,
} from "./nexra";

export function useNexraAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [session, setSession] = useState<Session>({ accountId: null, loginAt: 0 });
  const [googleLoading, setGoogleLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // Önce localStorage'dan session kontrol et
    const s = loadSession();
    if (s.accountId) {
      const accs = loadAccounts();
      const acc = accs.find((a) => a.id === s.accountId) || null;
      if (acc && acc.premiumUntil && acc.premiumUntil < Date.now()) {
        const expired = { ...acc, premium: false, premiumUntil: undefined };
        saveAccounts(loadAccounts().map((a) => (a.id === expired.id ? expired : a)));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(s);
        setAccount(expired);
      } else {
        setSession(s);
        setAccount(acc);
      }
    } else {
      setSession(s);
    }

    // Otomatik Google giriş kontrolü — cookie'den session oku
    async function checkGoogleSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.ok && data.authenticated && data.user) {
          // Google session bulundu — otomatik giriş yap
          const googleUser = data.user;
          const accs = loadAccounts();
          let acc = accs.find((a) => a.email.toLowerCase() === googleUser.email.toLowerCase());

          const googleIdentity = {
            sub: googleUser.id || googleUser.email,
            name: googleUser.name || googleUser.email.split("@")[0],
            picture: googleUser.picture,
          };

          if (!acc) {
            // Yeni Google kullanıcısı — hesap oluştur
            acc = {
              id: uid(),
              email: googleUser.email,
              username: googleUser.name || googleUser.email.split("@")[0],
              premium: false,
              createdAt: Date.now(),
              subscription: "none",
              unlocks: {},
              google: googleIdentity,
            };
            saveAccounts([...accs, acc]);
          } else if (!acc.google) {
            // Mevcut hesabı Google kimliğiyle bağla
            acc = { ...acc, google: googleIdentity };
            saveAccounts(loadAccounts().map((a) => (a.id === acc!.id ? acc! : a)));
          }

          const newSession: Session = { accountId: acc.id, loginAt: Date.now(), method: "google" };
          saveSession(newSession);
          setSession(newSession);
          setAccount(acc);
        }
      } catch {
        // sessizce başarısız — demo mode
      }
    }
    checkGoogleSession();
  }, []);

  const signup = useCallback(
    (email: string, username: string, password: string): { ok: boolean; error?: string } => {
      const accs = loadAccounts();
      if (accs.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: "Bu e-posta zaten kayitli." };
      }
      if (password.length < 4) {
        return { ok: false, error: "Sifre en az 4 karakter." };
      }
      const newAcc: Account = {
        id: uid(),
        email,
        username,
        passwordHash: hashPwd(password),
        premium: false,
        createdAt: Date.now(),
        subscription: "none",
        unlocks: {},
      };
      saveAccounts([...accs, newAcc]);
      const s: Session = { accountId: newAcc.id, loginAt: Date.now(), method: "password" };
      saveSession(s);
      setSession(s);
      setAccount(newAcc);
      return { ok: true };
    },
    []
  );

  const login = useCallback(
    (email: string, password: string): { ok: boolean; error?: string } => {
      const accs = loadAccounts();
      const acc = accs.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (!acc) return { ok: false, error: "Hesap bulunamadi." };
      if (!acc.passwordHash || acc.passwordHash !== hashPwd(password)) {
        return { ok: false, error: "Sifre yanlis." };
      }
      let finalAcc = acc;
      if (acc.premiumUntil && acc.premiumUntil < Date.now()) {
        finalAcc = { ...acc, premium: false, premiumUntil: undefined };
        saveAccounts(accs.map((a) => (a.id === finalAcc.id ? finalAcc : a)));
      }
      const s: Session = { accountId: finalAcc.id, loginAt: Date.now(), method: "password" };
      saveSession(s);
      setSession(s);
      setAccount(finalAcc);
      return { ok: true };
    },
    []
  );

  const loginWithGoogle = useCallback(
    (profile: GoogleProfile): { ok: boolean; error?: string } => {
      const accs = loadAccounts();
      // find existing Google account by sub or email
      let acc = accs.find(
        (a) => (a.google?.sub && a.google.sub === profile.sub) || a.email.toLowerCase() === profile.email.toLowerCase()
      );
      if (!acc) {
        // create new account from Google profile
        acc = {
          id: uid(),
          email: profile.email,
          username: profile.name || profile.givenName || profile.email.split("@")[0],
          premium: false,
          createdAt: Date.now(),
          subscription: "none",
          unlocks: {},
          google: profile,
        };
        saveAccounts([...accs, acc]);
      } else if (!acc.google) {
        // link google identity to existing account
        const updated = { ...acc, google: profile };
        saveAccounts(accs.map((a) => (a.id === updated.id ? updated : a)));
        acc = updated;
      }
      const s: Session = { accountId: acc.id, loginAt: Date.now(), method: "google" };
      saveSession(s);
      setSession(s);
      setAccount(acc);
      return { ok: true };
    },
    []
  );

  const loginWithGoogleEmail = useCallback(
    (email: string, name?: string): { ok: boolean; error?: string } => {
      const profile = makeGoogleProfile(email, name);
      return loginWithGoogle(profile);
    },
    [loginWithGoogle]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession({ accountId: null, loginAt: 0 });
    setAccount(null);
  }, []);

  const activateSubscription = useCallback(
    (tier: SubscriptionTier, days: number = 30) => {
      if (!account) return;
      const now = Date.now();
      const base = account.subscriptionUntil && account.subscriptionUntil > now ? account.subscriptionUntil : now;
      const subscriptionUntil = base + days * 24 * 60 * 60 * 1000;
      // determine premium flag from tier
      const isPremium = tier !== "none";
      const updated: Account = {
        ...account,
        subscription: tier,
        subscriptionUntil,
        premium: isPremium,
        premiumUntil: isPremium ? subscriptionUntil : undefined,
      };
      setAccount(updated);
      saveAccounts(loadAccounts().map((a) => (a.id === updated.id ? updated : a)));
    },
    [account]
  );

  // legacy compat
  const activatePremium = useCallback(
    (days: number) => activateSubscription("premium", days),
    [activateSubscription]
  );

  const canUseModel = useCallback(
    (modelId: NexraModelId): { ok: boolean; reason?: string } => {
      const meta = MODEL_MAP[modelId];
      if (!meta) return { ok: false, reason: "yok" };
      if (meta.tier === "free") return { ok: true };
      if (!account) return { ok: false, reason: "giris gerekli" };
      // freedom model requires freedom subscription
      if (meta.isFreedom) {
        if (account.subscription !== "freedom") return { ok: false, reason: "özgür zeka aboneliği gerekli" };
      }
      // check subscription tier
      const sub = account.subscription || "none";
      // check expiry
      if (account.subscriptionUntil && account.subscriptionUntil < Date.now() && sub !== "none") {
        return { ok: false, reason: "abonelik suresi doldu" };
      }
      const tierMeta = SUBSCRIPTION_TIERS[sub];
      if (!tierMeta || !tierMeta.unlocks.includes(meta.tier)) {
        return { ok: false, reason: "abonelik gerekli" };
      }
      return { ok: true };
    },
    [account]
  );

  const attemptUnlock = useCallback(
    (modelId: NexraModelId): { ok: boolean; error?: string } => {
      // No more time-gated unlocks — subscription based only
      const meta = MODEL_MAP[modelId];
      if (!meta) return { ok: false, error: "Model yok." };
      const status = canUseModel(modelId);
      if (status.ok) return { ok: true };
      return { ok: false, error: "Abonelik gerekli." };
    },
    [canUseModel]
  );

  return {
    account,
    session,
    isLoggedIn: !!account,
    isPremium: !!account?.premium,
    subscription: account?.subscription || "none",
    isGoogleAccount: !!account?.google,
    googleLoading,
    setGoogleLoading,
    signup,
    login,
    loginWithGoogle,
    loginWithGoogleEmail,
    logout,
    activatePremium,
    activateSubscription,
    attemptUnlock,
    canUseModel,
  };
}
