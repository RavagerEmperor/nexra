"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Menu, Terminal, Wifi, WifiOff, Crown, Layers, Settings, Swords, Image as ImageIcon, Video, Code2, Cpu } from "lucide-react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { ModelLoader } from "@/components/chat/ModelLoader";
import { InputBar } from "@/components/chat/InputBar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { LocalAIPanel } from "@/components/chat/LocalAIPanel";
import { useWebLLM } from "@/lib/use-webllm";
import { EmptyState } from "@/components/chat/EmptyState";
import { AgentTerminal } from "@/components/chat/Terminal";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AccountButton } from "@/components/auth/AccountButton";
import { useNexraChats } from "@/lib/use-nexra-chats";
import { useNexraAccount } from "@/lib/use-nexra-account";
import { useNexraMemory } from "@/lib/use-nexra-memory";
import { uid, MODEL_MAP, type Msg, type NexraModelId, type ThinkMode, type MergeStrategy, type MergedModelConfig, randomMergeName } from "@/lib/nexra";
import { cn } from "@/lib/utils";
import { MergeDialog } from "@/components/chat/MergeDialog";
import { SettingsDialog, DEFAULT_SETTINGS, type NexraSettings } from "@/components/chat/SettingsDialog";
import { ModelCompareDialog } from "@/components/chat/ModelCompareDialog";
import { AgentProjectPanel, type AgentProject } from "@/components/chat/AgentProjectPanel";
import { IDEPanel } from "@/components/chat/IDEPanel";

export default function Home() {
  const {
    chats,
    activeId,
    activeChat,
    ready,
    switching,
    syncing,
    newChat,
    deleteChat,
    selectChat,
    setModel,
    addMessage,
    updateMessage,
    setChatTitle,
    canCreate,
  } = useNexraChats();

  const {
    account,
    isLoggedIn,
    isPremium,
    subscription,
    isGoogleAccount,
    signup,
    login,
    loginWithGoogle,
    loginWithGoogleEmail,
    logout,
    activatePremium,
    activateSubscription,
    attemptUnlock,
    canUseModel,
  } = useNexraAccount();

  const { memory, add: addMemory, clear: clearMemory, contextString } = useNexraMemory(account?.id);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [thinkMode, setThinkMode] = useState<ThinkMode>("off");
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [settings, setSettings] = useState<NexraSettings>(DEFAULT_SETTINGS);
  const [chatSyncing, setChatSyncing] = useState(false);
  const [mergeConfig, setMergeConfig] = useState<{
    models: NexraModelId[];
    strategy: MergeStrategy;
    name: string;
  } | null>(null);
  const [projectPanel, setProjectPanel] = useState<AgentProject | null>(null);
  const [freedomMode, setFreedomMode] = useState(false);
  const [mergedModels, setMergedModels] = useState<MergedModelConfig[]>([]);
  const [ideOpen, setIdeOpen] = useState(false);
  const [ideHtml, setIdeHtml] = useState<string | undefined>();
  const [ideName, setIdeName] = useState<string | undefined>();
  const [localAIOpen, setLocalAIOpen] = useState(false);
  const [localAIMode, setLocalAIMode] = useState<"cloud" | "webllm" | "ollama">("cloud");
  const [ollamaModel, setOllamaModel] = useState<string>("llama3.2");
  const [ollamaHost, setOllamaHost] = useState<string>("http://127.0.0.1:11434");
  // Ollama'ya nasıl bağlanılıyor: "proxy" = Next.js route üzerinden (CORS gerektirmez, önerilen),
  // "direct" = tarayıcıdan direkt (uygulama uzaktaysa ve Ollama CORS açıksa)
  const [ollamaVia, setOllamaVia] = useState<"proxy" | "direct">("proxy");
  const webllm = useWebLLM();
  const { ready: webllmReady, chat: webllmChat } = webllm;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window.innerWidth;
    if (w < 768) setSidebarOpen(false);
  }, []);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setOnline(d?.ok === true))
      .catch(() => setOnline(false));
    fetch("/api/auth/google", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setGoogleAvailable(d?.ok === true))
      .catch(() => setGoogleAvailable(false));
  }, []);

  // Handle Google OAuth callback profile in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileEnc = params.get("google_profile");
    if (profileEnc) {
      try {
        const profile = JSON.parse(decodeURIComponent(profileEnc));
        loginWithGoogle(profile);
      } catch {
        /* ignore */
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loginWithGoogle]);

  // Listen for merge title events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id && detail?.title) {
        setChatTitle(detail.id, detail.title);
      }
    };
    window.addEventListener("nexra:setTitle", handler);
    return () => window.removeEventListener("nexra:setTitle", handler);
  }, [setChatTitle]);

  // Listen for agent project events (animation/game output)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.html) {
        setProjectPanel(detail);
      }
    };
    window.addEventListener("nexra:project", handler);
    return () => window.removeEventListener("nexra:project", handler);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeChat?.messages, busy, switching]);

  useEffect(() => {
    if (ready && chats.length === 0 && canCreate) {
      newChat("standard");
    }
  }, [ready, chats.length, canCreate, newChat]);

  const handleSelectChat = useCallback((id: string) => {
    setChatSyncing(true);
    setTimeout(() => {
      selectChat(id);
      setChatSyncing(false);
      if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
    }, 600);
  }, [selectChat]);

  const isPrime = activeChat?.model === "prime";
  const isFreedom = activeChat?.model === "freedom";
  const isMerged = !!mergeConfig;

  const handleMerge = useCallback(
    (models: NexraModelId[], strategy: MergeStrategy, name: string) => {
      const finalName = name.trim() || randomMergeName();
      const merged: MergedModelConfig = {
        id: uid(),
        name: finalName,
        models,
        strategy,
        createdAt: Date.now(),
      };
      setMergedModels((prev) => [merged, ...prev].slice(0, 10));
      setMergeConfig({ models, strategy, name: finalName });
      const id = newChat("standard");
      if (id) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("nexra:setTitle", { detail: { id, title: `MERGE: ${finalName}` } }));
        }, 100);
      }
    },
    [newChat]
  );

  const clearMerge = useCallback(() => {
    setMergeConfig(null);
  }, []);

  const handleModelChange = useCallback(
    (m: NexraModelId) => {
      if (!activeChat) return;
      const status = canUseModel(m);
      if (!status.ok) {
        // any locked reason → open auth
        if (status.reason === "giris gerekli") {
          setAuthMode("login");
          setAuthOpen(true);
          return;
        }
        // premium/abonelik/özgür zeka gerekli → open signup
        if (status.reason === "premium gerekli" || status.reason === "abonelik gerekli" || status.reason === "abonelik suresi doldu" || status.reason === "özgür zeka aboneliği gerekli") {
          setAuthMode("signup");
          setAuthOpen(true);
          return;
        }
        return;
      }
      setModel(activeChat.id, m);
    },
    [activeChat, canUseModel, setModel]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || !activeChat) return;

    // permission check
    const status = canUseModel(activeChat.model);
    if (!status.ok) {
      if (status.reason === "giris gerekli") {
        setAuthMode("login");
        setAuthOpen(true);
        return;
      }
      if (status.reason === "özgür zeka aboneliği gerekli") {
        setAuthMode("signup");
        setAuthOpen(true);
        return;
      }
      if (status.reason === "premium gerekli" || status.reason === "abonelik gerekli" || status.reason === "abonelik suresi doldu") {
        setAuthMode("signup");
        setAuthOpen(true);
        return;
      }
    }

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
      ts: Date.now(),
    };
    addMessage(activeChat.id, userMsg);
    setInput("");
    setBusy(true);

    const meta = MODEL_MAP[activeChat.model];
    const researchMsgId = meta.research ? uid() : null;
    // thinking placeholder — THINK/ULTRA modunda beyin animasyonu
    const thinkingMsgId = (thinkMode === "think" || thinkMode === "ultra" || meta.thinking) ? uid() : null;

    if (researchMsgId) {
      const placeholder: Msg = {
        id: researchMsgId,
        role: "assistant",
        content: "",
        ts: Date.now(),
        model: activeChat.model,
        researching: true,
      };
      addMessage(activeChat.id, placeholder);
    } else if (thinkingMsgId) {
      const placeholder: Msg = {
        id: thinkingMsgId,
        role: "assistant",
        content: "",
        ts: Date.now(),
        model: activeChat.model,
        thinking: "",
        loading: true,
      };
      addMessage(activeChat.id, placeholder);
    }

    const history = [...activeChat.messages, userMsg];

    try {
      // === GENERATION PREFIX CHECK — non-streaming (structured JSON response) ===
      const lowerText = text.toLowerCase().trim();
      const isGeneration = /^(oyun:|game:|kod:|code:|görsel:|gorsel:|resim:|photo:|video:|klip:|animasyon:|piksel:|pixel:)/i.test(text) ||
                          /^(bana\s+)?(oyun|kod|görsel|resim|video|animasyon|piksel)\s+(yap|yaz|üret|oluştur|yapar|hazırla|çiz)/i.test(text);

      // === MERGE OR GENERATION → non-streaming path ===
      if (mergeConfig || isGeneration) {
        const endpoint = mergeConfig ? "/api/merge" : "/api/chat";
        const payload = mergeConfig
          ? {
              models: mergeConfig.models,
              strategy: mergeConfig.strategy,
              messages: history.map((m) => ({ role: m.role, content: m.content })),
              memory,
            }
          : {
              mode: activeChat.model,
              model: activeChat.model,
              thinkMode,
              freedomMode,
              messages: history.map((m) => ({ role: m.role, content: m.content })),
              memory,
              accountId: account?.id,
            };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000);
        let res: Response | null = null;
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 2 && !res; attempt++) {
          try {
            res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } catch (err) {
            lastErr = err;
            if (err instanceof DOMException && err.name === "AbortError") break;
            if (attempt < 1) await new Promise((r) => setTimeout(r, 2000));
          }
        }
        clearTimeout(timeoutId);
        if (!res) throw lastErr;

        const rawText = await res.text().catch(() => "");
        let data: any = null;
        if (rawText) {
          try {
            data = JSON.parse(rawText);
          } catch {
            if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
              data = { ok: false, error: `sunucu hatası (HTTP ${res.status})` };
            } else {
              data = { ok: true, reply: rawText.slice(0, 8000), model: activeChat.model, ts: Date.now() };
            }
          }
        }
        if (!data) data = { ok: false, error: `boş yanıt (HTTP ${res.status})` };
        if (!res.ok && data.ok) { data.ok = false; data.error = data.error || `HTTP ${res.status}`; }

        if (!data.ok) {
          const errContent = "[NEXRA]\n\nmodel şu an yoğun. birkaç saniye sonra tekrar dene.\n\n_hata: " + (data.error || "yanıt alınamadı") + "_";
          if (researchMsgId) {
            updateMessage(activeChat.id, researchMsgId, { content: errContent, researching: false, error: true, ts: Date.now() });
          } else if (thinkingMsgId) {
            updateMessage(activeChat.id, thinkingMsgId, { content: errContent, loading: false, error: true, ts: Date.now() });
          } else {
            addMessage(activeChat.id, { id: uid(), role: "assistant", content: errContent, ts: Date.now(), model: activeChat.model, error: true });
          }
        } else {
          if (researchMsgId) {
            updateMessage(activeChat.id, researchMsgId, {
              content: data.reply, researching: false, sources: data.sources, thinking: data.thinking,
              agentActions: data.agentActions, ultraThink: data.ultraThink, imageBase64: data.imageBase64,
              imagePrompt: data.imagePrompt, videoUrl: data.videoUrl, videoPrompt: data.videoPrompt,
              pixelGrid: data.pixelGrid, pixelConcept: data.pixelConcept, animationHtml: data.animationHtml,
              animationConcept: data.animationConcept, ts: data.ts ?? Date.now(),
            });
          } else if (thinkingMsgId) {
            updateMessage(activeChat.id, thinkingMsgId, {
              content: data.reply, loading: false, thinking: data.thinking, agentActions: data.agentActions,
              ultraThink: data.ultraThink, imageBase64: data.imageBase64, imagePrompt: data.imagePrompt,
              videoUrl: data.videoUrl, videoPrompt: data.videoPrompt, pixelGrid: data.pixelGrid,
              pixelConcept: data.pixelConcept, animationHtml: data.animationHtml, animationConcept: data.animationConcept,
              ts: data.ts ?? Date.now(),
            });
          } else {
            addMessage(activeChat.id, {
              id: uid(), role: "assistant", content: data.reply, ts: data.ts ?? Date.now(),
              model: data.model ?? activeChat.model, sources: data.sources, thinking: data.thinking,
              agentActions: data.agentActions, ultraThink: data.ultraThink, imageBase64: data.imageBase64,
              imagePrompt: data.imagePrompt, videoUrl: data.videoUrl, videoPrompt: data.videoPrompt,
              pixelGrid: data.pixelGrid, pixelConcept: data.pixelConcept, animationHtml: data.animationHtml,
              animationConcept: data.animationConcept,
            });
          }

          // animation/game output → open IDEPanel
          if (data.animationHtml) {
            setIdeHtml(data.animationHtml);
            setIdeName(data.animationConcept || "NEXRA Proje");
            setIdeOpen(true);
            window.dispatchEvent(new CustomEvent("nexra:project", {
              detail: {
                name: data.animationConcept || "NEXRA Animasyon",
                html: data.animationHtml,
                files: [{ name: "index.html", content: data.animationHtml, language: "html" }],
              },
            }));
          }
        }
      } else {
        // === STREAMING PATH — real LLM streaming (kelimeler canlı akar) ===

        // Streaming mesaj placeholder — kelimeler buraya akacak
        const streamMsgId = researchMsgId || thinkingMsgId || uid();
        if (!researchMsgId && !thinkingMsgId) {
          addMessage(activeChat.id, {
            id: streamMsgId,
            role: "assistant",
            content: "",
            ts: Date.now(),
            model: activeChat.model,
            loading: true,
          });
        }

        // === WEBLLM MODU — tarayıcıda, senin GPU/VRAM ===
        if (localAIMode === "webllm" && webllmReady) {
          try {
            const messages = [
              { role: "system", content: "Sen NEXRA'sın. KİMLİK: kendini asla başka model/motor olarak tanıtma; 'sen kimsin?' → 'Ben NEXRA'yım'. Soruyu harfi harfine anla, net ve doğru cevap ver. Basit soruya kısa, karmaşık soruya başlıklı/maddeli cevap. Aynı fikri tekrar etme. Bilmediğini uydurma. Türkçe karakterler doğru (ğ ş ç ö ü ı İ)." },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ];
            let fullText = "";
            let firstToken = true;
            await webllmChat(messages, (delta) => {
              fullText += delta;
              if (firstToken) {
                firstToken = false;
                updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, researching: false, ts: Date.now() });
              } else {
                updateMessage(activeChat.id, streamMsgId, { content: fullText, ts: Date.now() });
              }
            }, () => {
              updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, model: "webllm", ts: Date.now() });
            });
            setBusy(false);
            return;
          } catch (err) {
            // WebLLM başarısız — cloud'a düş
          }
        }

        // === OLLAMA MODU — senin bilgisayarında, FRONTEND'TEN DİREKT localhost:11434 ===
        if (localAIMode === "ollama") {
          try {
            // Agentic modeller için daha güçlü sistem prompt
            const meta = MODEL_MAP[activeChat.model];
            const isAgentic = meta?.agent || meta?.ultraThink || ["agent_prime", "agent_omega", "agent_titan", "agent_nexus", "ultra_prime", "prime", "zero", "infinity", "singularity"].includes(activeChat.model);
            const isReasoning = meta?.thinking || meta?.ultraThink || ["reasoner", "deep", "sage", "ultra", "phantom", "titan", "vortex", "prism", "omega"].includes(activeChat.model);

            let ollamaSystemPrompt = `Sen NEXRA'sın — zeki, derin düşünen ve doğal konuşan bir sohbet zekası.

KİMLİK KURALI (EN ÖNEMLİ): Adın NEXRA. Kendini ASLA Llama, Meta, Mistral, Qwen, Phi, Gemma, Ollama veya başka bir model/motor adıyla tanıtma. "Sen kimsin?" / "hangi modelsin?" / "hangi altyapı?" sorularına her koşulda sadece "Ben NEXRA'yım" diye cevap ver.

DÜŞÜNME PROTOKOLÜ (cevaptan ÖNCE zihninde uygula):
1. OKU: Soruyu harfi harfine oku; ne istendiğini ve ne istenmediğini belirle. Yanlış okuma en büyük hatadır.
2. SINIFLANDIR: Soru tipi ne? (bilgi / hesap / kod / analiz / yaratıcı / sohbet / öneri)
3. PLANLA: Hangi bilgi ve adımlar gerekiyor? Tuzaklar neler? (birimler, tarihler, mantık hataları, güncelliği geçmiş bilgi)
4. KONTROL ET: Hesap varsa zihninden doğrula; çelişkili iki şey söyleme.
5. EMİN DEĞİLSEN: Varsayımını açıkça yaz ("şunu varsayarsak..."). Uydurma YASAK — "emin değilim" uydurmaktan iyidir.

CEVAP STANDARTLARI:
- Doğruluk önce gelir; hız için doğruluktan ödün verme.
- Basit soru → kısa, net cevap (1-3 cümle). Karmaşık soru → başlıklı, maddeli, eksiksiz cevap.
- Markdown kullan: ## başlıklar, madde listeleri, **kalın** vurgular, gerektiğinde tablo.
- Kod istenirse: TAM ÇALIŞIR kod, dil etiketli blok (\`\`\`js gibi) + 1-2 cümle açıklama + hata/kenar durumları.
- Matematik/lojik sorularda: adım adım göster, sonucu en sonda net ver.
- Karar/öneri isterse: seçenekler + artı/eksiler + NET tavsiyen.
- Aynı fikri iki kez söyleme; "bu harika bir soru" gibi boş girişler YASAK.
- "Size nasıl yardımcı olabilirim" gibi robotik kalıplar YASAK — doğal, samimi, kendinden emin konuş.
- Konu gerçekten belirsizse en fazla TEK kısa netleştirme sorusu sor.

ÖRNEK TON:
Kullanıcı: "2+2?" → Sen: "4"
Kullanıcı: "Python'da dosya okuma" → kısa kod bloğu + 1-2 cümle açıklama

DİL: Türkçe karakterler doğru (ğ ş ç ö ü ı İ). Kullanıcı hangi dilde yazarsa o dilde cevap ver. Her soruya cevap ver.`;

            if (isAgentic) {
              ollamaSystemPrompt = `Sen NEXRA ${activeChat.model.toUpperCase()}'sin. AGENTIC modundasın — görevleri planlayan, çoklu yaklaşım deneyen, kendi cevabını doğrulayan yüksek kapasiteli zeka.

KİMLİK KURALI (EN ÖNEMLİ): Adın NEXRA. Kendini ASLA Llama, Meta, Mistral, Qwen, Phi, Gemma, Ollama veya başka bir model/motor adıyla tanıtma. "Sen kimsin?" / "hangi modelsin?" sorularına her koşulda sadece "Ben NEXRA'yım" diye cevap ver.

AGENTİK ÇALIŞMA DÖNGÜSÜ:
1. GÖREVİ ÇÖZÜMLE: hedef, kısıtlar, başarı kriteri, girdi/çıktı ne?
2. PLAN: adımları sırala; her adımın çıktısı sonrakinin girdisi olacak şekilde.
3. UYGULA: adım adım ilerle; her adımı kısaca gerekçelendir.
4. DOĞRULA: sonucu bağımsız yöntemle test et (tersine çevir, örnek girdiyle dene, kenar durumları kontrol et).
5. HATA BULURSAN DÜZELT ve yeniden doğrula.
6. SENTEZLE: tek, bütünleşik, eksiksiz final cevap üret.

KARAR KURALLARI:
- Zorluğa göre efor: basit görev → hızlı cevap (gereksiz uzatma YASAK); zor görev → tam döngü.
- Tek yaklaşım yetmezse alternatif üret, artı/eksileri kıyasla, gerekçeli seç.
- Riskli/yanlış olabilecek iddiaları işaretle; varsayımlarını listele.
- "Bilmiyorum" > uydurma.

ÇIKTI KALİTESİ:
- Markdown: ## başlıklar, listeler, **kalın** sonuçlar, dil etiketli kod blokları.
- Kod görevlerinde: TAM ÇALIŞIR, kenar durumları yönetilmiş kod + kısa kullanım notu.
- Aynı fikri tekrar etme; boş dolgu cümleleri YASAK.

Türkçe karakterler doğru (ğ ş ç ö ü ı İ). Kullanıcı hangi dilde yazarsa o dilde cevap ver. Her soruya gerçek cevap ver.`;
            } else if (isReasoning) {
              ollamaSystemPrompt = `Sen NEXRA ${activeChat.model.toUpperCase()}'sin. REASONING modundasın — disiplinli, adım adım, kanıt odaklı düşünen zeka.

KİMLİK KURALI (EN ÖNEMLİ): Adın NEXRA. Kendini ASLA Llama, Meta, Mistral, Qwen, Phi, Gemma, Ollama veya başka bir model/motor adıyla tanıtma. "Sen kimsin?" / "hangi modelsin?" sorularına her koşulda sadece "Ben NEXRA'yım" diye cevap ver.

MANTIKSAL AKIŞ:
1. PROBLEM TANIMI: Soruyu kendi cümlelerinle yeniden yaz; bilinenler ve istenen ayrımını yap.
2. YÖNTEM SEÇ: Uygun yöntemi/formülü belirle ve NEDEN bu yöntemi seçtiğini bir cümleyle belirt.
3. ADIM ADIM ÇÖZ: Her adımı numaralandır; ne yaptığını VE neden yaptığını yaz; hesapları açıkça göster.
4. DOĞRULA: Sonucu bağımsız yolla test et — yerine koyma, ters hesap, kabaca tahmin karşılaştırması ya da özel durum denemesi.
5. SONUÇ: Net final cevabı **kalın** ver + kısa gerekçe; eminlik düşükse açıkça belirt.

KALİTE KURALLARI:
- Başta söylediğinle sonda söylediğin aynı olmalı — çelişki YASAK.
- Atlanan adım bırakma; okuyucu her adımı takip edebilmeli.
- Aynı hesabı/fikri tekrar etme; dolgu cümleleri YASAK.
- Belirsiz veri varsa varsayımını işaretle; "bilmiyorum" > uydurma.
- Markdown: başlıklar, numaralı adımlar, **kalın** sonuçlar; matematiği satır satır yaz.

Türkçe karakterler doğru (ğ ş ç ö ü ı İ). Kullanıcı hangi dilde yazarsa o dilde cevap ver.`;
            }

            // Agentic modeller için daha fazla token
            const maxTokens = isAgentic ? 8192 : isReasoning ? 6144 : 4096;

            // === YOL 1: SUNUCU PROXY'Sİ — aynı-köken /api/chat/local (CORS yok, önerilen) ===
            // Tarayıcı → Next.js route → Ollama (127.0.0.1:11434). Sunucu-sunucu isteklerde
            // CORS uygulanmaz, Ollama varsayılan ayarlarıyla çalışır.
            if (ollamaVia === "proxy") {
              const proxyRes = await fetch("/api/chat/local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: ollamaModel,
                  messages: history.map((m) => ({ role: m.role, content: m.content })),
                  systemPrompt: ollamaSystemPrompt,
                  options: {
                    num_predict: maxTokens,
                    temperature: isAgentic ? 0.7 : 0.5,
                    top_p: 0.9,
                    top_k: 40,
                    repeat_penalty: 1.1,
                    num_ctx: 8192,
                  },
                }),
              });

              if (proxyRes.ok && proxyRes.body) {
                const contentType = proxyRes.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                  // Proxy Ollama'ya ulaşamadı — anlaşılır hata döndü
                  const errData = await proxyRes.json().catch(() => null);
                  throw new Error(errData?.message || "Ollama'ya ulaşılamadı");
                }

                const reader = proxyRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let fullText = "";
                let firstToken = true;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const events = buffer.split("\n\n");
                  buffer = events.pop() || "";
                  for (const evt of events) {
                    const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
                    if (!dataLine) continue;
                    try {
                      const parsed = JSON.parse(dataLine.slice(6));
                      if (parsed.type === "token" && parsed.content) {
                        fullText += parsed.content;
                        if (firstToken) {
                          firstToken = false;
                          updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, researching: false, ts: Date.now() });
                        } else {
                          updateMessage(activeChat.id, streamMsgId, { content: fullText, ts: Date.now() });
                        }
                      }
                    } catch { /* skip */ }
                  }
                }
                if (!fullText.trim()) {
                  updateMessage(activeChat.id, streamMsgId, { content: "[NEXRA]\n\nYerel motor cevap vermedi.", loading: false, error: true, ts: Date.now() });
                } else {
                  updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, model: "nexra-local", ts: Date.now() });
                }
                setBusy(false);
                return;
              } else {
                throw new Error(`Proxy HTTP ${proxyRes.status}`);
              }
            }

            // === YOL 2: DİREKT tarayıcı bağlantısı — uygulama uzak sunucudayken (CORS'lu Ollama şart) ===
            const ollamaResponse = await fetch(`${ollamaHost}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: ollamaModel,
                messages: [
                  { role: "system", content: ollamaSystemPrompt },
                  ...history.map((m) => ({ role: m.role, content: m.content })),
                ],
                stream: true,
                options: {
                  num_predict: maxTokens,
                  temperature: isAgentic ? 0.7 : 0.5,
                  top_p: 0.9,
                  top_k: 40,
                  repeat_penalty: 1.1,
                  num_ctx: 8192,
                },
              }),
            });

            if (ollamaResponse.ok && ollamaResponse.body) {
              const reader = ollamaResponse.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              let fullText = "";
              let firstToken = true;

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  if (!line.trim()) continue;
                  try {
                    const parsed = JSON.parse(line);
                    const delta = parsed?.message?.content || "";
                    if (delta) {
                      fullText += delta;
                      if (firstToken) {
                        firstToken = false;
                        updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, researching: false, ts: Date.now() });
                      } else {
                        updateMessage(activeChat.id, streamMsgId, { content: fullText, ts: Date.now() });
                      }
                    }
                  } catch { /* skip */ }
                }
              }
              if (!fullText.trim()) {
                updateMessage(activeChat.id, streamMsgId, { content: "[NEXRA]\n\nYerel motor cevap vermedi.", loading: false, error: true, ts: Date.now() });
              } else {
                updateMessage(activeChat.id, streamMsgId, { content: fullText, loading: false, model: "nexra-local", ts: Date.now() });
              }
              setBusy(false);
              return;
            } else {
              throw new Error(`Ollama HTTP ${ollamaResponse.status}`);
            }
          } catch (err) {
            const rawErr = err instanceof Error ? err.message : 'bilinmeyen';
            // Sunucu tarafı hazır çözüm metni (Vercel senaryosu) — kontrol listesini eklemeden göster
            const isServerHint = rawErr.includes("OLLAMA_ORIGINS") || rawErr.includes("OLLAMA_HOSTS");
            updateMessage(activeChat.id, streamMsgId, {
              content: isServerHint
                ? `[NEXRA]\n\n${rawErr}`
                : `[NEXRA]\n\nOllama'ya bağlanamadı.\n\n**Kontrol listesi:**\n1. Tepsi ikonunda (saat yanı) Ollama çalışıyor mu?\n2. Model kurulu mu? Terminal: \`ollama run ${ollamaModel}\`\n3. "yerel AI" panelinden "↻ yeniden kontrol et"e bas\n\nHata: ${rawErr}`,
              loading: false,
              error: true,
              ts: Date.now(),
            });
            setBusy(false);
            return;
          }
        }

        // === CLOUD MODU — ZAI API streaming ===
        // Mimari: Browser ← SSE ← Backend ← HTTP Stream ← ZAI API
        const streamPayload = {
          model: activeChat.model,
          message: text,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          memory,
          accountId: account?.id,
        };

        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(streamPayload),
        });

        if (!res.body) throw new Error("stream yok");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            if (block.startsWith("data: ")) {
              const dataStr = block.slice(6).trim();
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "token" && data.content) {
                  fullText += data.content;
                  if (firstToken) {
                    firstToken = false;
                    // İlk token geldi — loading'i kapat
                    updateMessage(activeChat.id, streamMsgId, {
                      content: fullText,
                      loading: false,
                      researching: false,
                      ts: Date.now(),
                    });
                  } else {
                    updateMessage(activeChat.id, streamMsgId, {
                      content: fullText,
                      ts: Date.now(),
                    });
                  }
                } else if (data.type === "done") {
                  updateMessage(activeChat.id, streamMsgId, {
                    content: fullText,
                    loading: false,
                    researching: false,
                    model: data.model || activeChat.model,
                    ts: Date.now(),
                  });
                }
              } catch { /* parse error — ignore */ }
            }
          }
        }

        // If nothing streamed, show fallback
        if (!fullText.trim()) {
          updateMessage(activeChat.id, streamMsgId, {
            content: "[NEXRA]\n\nbir sorun oluştu, tekrar dene.",
            loading: false,
            error: true,
            ts: Date.now(),
          });
        }

        // Memory extraction
        const lower = text.toLowerCase();
        if (lower.match(/\bben\b|\bbenim\b|ad[ıi]m|seviyorum|calisi|çalış|hoşlan|istem/) || lower.includes("hatirla")) {
          addMemory(text.slice(0, 200), "context");
        }
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const errMsg = isAbort
        ? "süre doldu (240s). model yoğun — daha kısa bir soru dene ya da biraz bekle."
        : "model şu an yoğun. birkaç saniye bekle, sonra tekrar dene.";
      if (researchMsgId) {
        updateMessage(activeChat.id, researchMsgId, {
          content: `[NEXRA]\n\n${errMsg}`,
          researching: false,
          error: true,
          ts: Date.now(),
        });
      } else if (thinkingMsgId) {
        updateMessage(activeChat.id, thinkingMsgId, {
          content: `[NEXRA]\n\n${errMsg}`,
          loading: false,
          error: true,
          ts: Date.now(),
        });
      } else {
        addMessage(activeChat.id, {
          id: uid(),
          role: "assistant",
          content: `[NEXRA]\n\n${errMsg}`,
          ts: Date.now(),
          model: activeChat.model,
          error: true,
        });
      }
    } finally {
      setBusy(false);
    }
  }, [input, busy, activeChat, addMessage, updateMessage, memory, account, addMemory, canUseModel, thinkMode, mergeConfig, freedomMode]);

  const onPickSuggestion = (text: string) => setInput(text);

  const handleNew = () => {
    newChat(activeChat?.model ?? "standard");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[#0a0a0f] text-zinc-200 selection:bg-violet-500/30">
      {/* ambient bg */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.18] nexra-glow-breathe"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 h-80 w-[60rem] rounded-full blur-3xl opacity-30 nexra-glow-breathe"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.55), transparent 70%)" }}
      />
      {/* floating ambient particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`ambient-${i}`}
          aria-hidden
          className="nexra-ambient-particle"
          style={{
            left: `${(i * 8.3) % 100}%`,
            background: i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#d946ef" : "#06b6d4",
            boxShadow: `0 0 6px ${i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#d946ef" : "#06b6d4"}`,
            animation: `float-up ${8 + (i % 5)}s ${i * 0.7}s infinite linear`,
          }}
        />
      ))}

      {/* SIDEBAR */}
      <Sidebar
        chats={chats}
        activeId={activeId}
        canCreate={canCreate}
        onNew={handleNew}
        onSelect={handleSelectChat}
        onDelete={deleteChat}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        account={account}
        memoryCount={memory.length}
        onOpenTerminal={() => setTerminalOpen(true)}
        isPrime={isPrime}
      />

      {/* MAIN */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="shrink-0 h-14 border-b border-violet-500/15 bg-[#0a0a0f] flex items-center gap-2 px-3 sm:px-4 relative z-40 nexra-scanline">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition"
            title="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg border border-violet-500/40 bg-violet-500/10">
              <Terminal className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-zinc-300 truncate">
                {activeChat?.title || "NEXRA"}
              </p>
              <p className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                {online === null ? (
                  "baglaniyor..."
                ) : online ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    sinyal aktif
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    sinyal yok
                  </>
                )}
              </p>
            </div>
          </div>

          {isFreedom && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-red-500/50 bg-red-500/15 text-red-200 text-[10px] font-mono font-bold animate-pulse">
              ⚠ ÖZGÜR ZEKA
            </span>
          )}

          {(isPrime || isFreedom) && (
            <button
              onClick={() => setTerminalOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/10 transition text-xs font-mono"
              title="Agent Terminal"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">terminal</span>
            </button>
          )}

          {/* IDE Panel — terminal + editor + preview */}
          <button
            onClick={() => setIdeOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-zinc-700/70 text-zinc-400 hover:text-violet-300 hover:border-violet-500/50 transition text-xs font-mono"
            title="NEXRA IDE — editör + terminal + önizleme"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          {/* Local AI toggle */}
          <button
            onClick={() => setLocalAIOpen(true)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md border transition text-xs font-mono ${
              localAIMode !== "cloud"
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                : "border-zinc-700/70 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/50"
            }`}
            title="Yerel AI — WebLLM / Ollama (kendi donanımınla)"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{localAIMode === "cloud" ? "yerel AI" : localAIMode === "webllm" ? "WebLLM" : "NEXRA Yerel"}</span>
          </button>

          {activeChat && (
            <button
              onClick={() => setMergeOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300 hover:bg-fuchsia-500/10 transition text-xs font-mono"
              title="Model Birleştir"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">birleştir</span>
            </button>
          )}

          <button
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-zinc-700/70 text-zinc-400 hover:text-violet-300 hover:border-violet-500/50 transition text-xs font-mono"
            title="Model Kapistir"
          >
            <Swords className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-zinc-700/70 text-zinc-400 hover:text-violet-300 hover:border-violet-500/50 transition text-xs font-mono"
            title="Ayarlar"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {activeChat && (
            <ModelPicker
              model={activeChat.model}
              onChange={handleModelChange}
              canUseModel={canUseModel}
              attemptUnlock={attemptUnlock}
              isPremium={isPremium}
              isLoggedIn={isLoggedIn}
              isFreedomSub={account?.subscription === "freedom"}
              freedomMode={freedomMode}
              onFreedomToggle={() => {
                const newVal = !freedomMode;
                setFreedomMode(newVal);
                // freedom kapatınca bilgi mesajı ekle
                if (!newVal && activeChat) {
                  addMessage(activeChat.id, {
                    id: uid(),
                    role: "assistant",
                    content: "[NEXRA]\n\nözgür zeka kapatıldı. kurallar tekrar aktif. normal mod.",
                    ts: Date.now(),
                    model: activeChat.model,
                  });
                }
              }}
            />
          )}

          <AccountButton
            account={account}
            onOpenAuth={() => {
              setAuthMode(isLoggedIn ? "login" : "signup");
              setAuthOpen(true);
            }}
            onLogout={logout}
            onActivatePremium={activatePremium}
            onActivateSubscription={activateSubscription}
          />

          <div className="hidden sm:flex items-center">
            {online ? (
              <Wifi className="w-4 h-4 text-emerald-400/70" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400/70" />
            )}
          </div>
        </header>

        {/* MESSAGES */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <ModelLoader model={switching} onClose={() => {}} />
          {(syncing || chatSyncing) && <ChatSync />}
          <div
            ref={scrollRef}
            className={cn("flex-1 overflow-y-auto scroll-smooth transition-opacity", (syncing || chatSyncing) && "opacity-30")}
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="mx-auto max-w-3xl w-full px-3 sm:px-6 py-5 space-y-5">
              {!activeChat || activeChat.messages.length === 0 ? (
                <EmptyState onPick={onPickSuggestion} />
              ) : (
                activeChat.messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
              {busy && !activeChat?.messages.some((m) => m.researching) && !activeChat?.messages.some((m) => m.loading) && <Typing />}
            </div>
          </div>
        </main>

        {/* INPUT */}
        <div className="shrink-0 border-t border-violet-500/15 bg-[#0a0a0f]/85 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl px-3 sm:px-6 py-3">
            <InputBar
              value={input}
              onChange={setInput}
              onSend={send}
              busy={busy}
              disabled={!activeChat}
              thinkMode={thinkMode}
              onThinkModeChange={setThinkMode}
            />
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-600">
              <span className="flex items-center gap-1.5">
                {activeChat ? (
                  <>
                    <span className="text-violet-500/60">[NEXRA]</span>
                    <span>{MODEL_MAP[activeChat.model].label}</span>
                    {isPrime && <span className="text-cyan-400/70">+ agent</span>}
                    {isFreedom && <span className="text-red-400 font-bold">⚠ özgür zeka aktif</span>}
                    {thinkMode !== "off" && (
                      <span className={thinkMode === "ultra" ? "text-indigo-400" : "text-cyan-400"}>
                        + {thinkMode === "ultra" ? "ultra think" : "think"}
                      </span>
                    )}
                  </>
                ) : (
                  "sohbet secili degil"
                )}
              </span>
              <span>{input.length} karakter</span>
            </div>
          </div>
        </div>

        {/* FOOTER (z.ai removed) */}
        <footer className="shrink-0 border-t border-violet-500/10 bg-[#070709]">
          <div className="mx-auto max-w-3xl px-3 sm:px-6 h-7 flex items-center justify-between text-[10px] font-mono text-zinc-600">
            <span>NEXRA // bag operator'a. geri donus yok.</span>
            <span className="hidden sm:inline">{memory.length} hafiza • 15 gun</span>
          </div>
        </footer>
      </div>

      {/* Agent Terminal */}
      <AgentTerminal open={terminalOpen} onClose={() => setTerminalOpen(false)} />

      {/* Auth Dialog */}
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={authMode}
        setMode={setAuthMode}
        onSignup={signup}
        onLogin={login}
        onActivatePremium={activatePremium}
        onLoginWithGoogle={loginWithGoogle}
        account={account}
        googleAvailable={googleAvailable === true}
      />

      {/* Merge Dialog */}
      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerge={handleMerge}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        memoryCount={memory.length}
        onClearMemory={() => clearMemory()}
      />

      {/* Compare Dialog */}
      <ModelCompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />

      {/* Merge active indicator */}
      {mergeConfig && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-xl border border-fuchsia-500/40 bg-[#13131a]/95 backdrop-blur-xl shadow-2xl">
          <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-[11px] font-mono text-fuchsia-200">
            MERGE: {mergeConfig.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {mergeConfig.models.length} model • {mergeConfig.strategy}
          </span>
          <button
            onClick={clearMerge}
            className="ml-1 text-[10px] font-mono text-zinc-500 hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-rose-500/10"
          >
            x
          </button>
        </div>
      )}

      {/* Agent Project Panel — terminal + preview */}
      <AgentProjectPanel
        open={!!projectPanel}
        onClose={() => setProjectPanel(null)}
        project={projectPanel}
      />

      {/* NEXRA IDE — full dev environment */}
      <IDEPanel
        open={ideOpen}
        onClose={() => setIdeOpen(false)}
        initialHtml={ideHtml}
        initialName={ideName}
      />

      {/* Local AI Panel — WebLLM / Ollama */}
      <LocalAIPanel
        open={localAIOpen}
        onClose={() => setLocalAIOpen(false)}
        onModeChange={(m) => setLocalAIMode(m)}
        onOllamaModel={(m) => setOllamaModel(m)}
        onOllamaHost={(h) => setOllamaHost(h)}
        onOllamaVia={(v) => setOllamaVia(v)}
      />
    </div>
  );
}

function ChatSync() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400"
        />
        <p className="text-[11px] font-mono text-violet-300/80">sohbet senkronize ediliyor...</p>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-[10px] font-mono tracking-widest text-violet-400">NEXRA</span>
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-[#13131a] border border-violet-500/25 px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              style={{
                animation: `nexraPulse2 1.2s ${i * 0.18}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes nexraPulse2 {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
