"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Download, CheckCircle2, Loader2, AlertCircle, Zap, HardDrive } from "lucide-react";
import { useWebLLM } from "@/lib/use-webllm";
import { useEscapeKey } from "@/lib/use-escape-key";
import { cn } from "@/lib/utils";

export function LocalAIPanel({
  open,
  onClose,
  onModeChange,
  onOllamaModel,
  onOllamaHost,
  onOllamaVia,
}: {
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: "cloud" | "webllm" | "ollama") => void;
  onOllamaModel?: (model: string) => void;
  onOllamaHost?: (host: string) => void;
  onOllamaVia?: (via: "proxy" | "direct") => void;
}) {
  const [mode, setMode] = useState<"cloud" | "webllm" | "ollama">("cloud");
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "cors" | "offline">("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaModel, setOllamaModel] = useState<string>("llama3.2");
  const [ollamaHost, setOllamaHost] = useState<string>("http://127.0.0.1:11434");
  const [ollamaVia, setOllamaVia] = useState<"proxy" | "direct">("proxy");
  const [checkNonce, setCheckNonce] = useState(0);
  // Uygulama uzak bir platformda mı yayında (Vercel vb.)? — talimat metinleri buna göre seçilir.
  // Lazy initializer: SSR'da false, tarayıcıda hostname'e göre hesaplanır (effect'e gerek yok).
  const [isRemote] = useState(
    () =>
      typeof window !== "undefined" &&
      !(["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) ||
        window.location.hostname.endsWith(".localhost"))
  );

  // 8GB ve altı popüler Ollama modelleri — kullanıcının seçebileceği öneriler
  const OLLAMA_MODEL_SUGGESTIONS = [
    { id: "llama3.2", label: "Llama 3.2 (1B/3B) — hızlı, ~2GB", size: "2GB" },
    { id: "llama3.1:8b", label: "Llama 3.1 8B — güçlü, ~5GB", size: "5GB" },
    { id: "mistral:7b", label: "Mistral 7B — dengeli, ~4.5GB", size: "4.5GB" },
    { id: "qwen2.5:7b", label: "Qwen 2.5 7B — Türkçe iyi, ~4.5GB", size: "4.5GB" },
    { id: "qwen2.5:3b", label: "Qwen 2.5 3B — hızlı+Türkçe, ~2GB", size: "2GB" },
    { id: "phi3:14b", label: "Phi 3 14B — en güçlü, ~8GB", size: "8GB" },
    { id: "phi3:mini", label: "Phi 3 mini — Microsoft, ~2.5GB", size: "2.5GB" },
    { id: "gemma2:9b", label: "Gemma 2 9B — Google, ~5.5GB", size: "5.5GB" },
    { id: "gemma2:2b", label: "Gemma 2 2B — hızlı, ~1.5GB", size: "1.5GB" },
    { id: "deepseek-r1:7b", label: "DeepSeek R1 7B — reasoning, ~4.5GB", size: "4.5GB" },
    { id: "deepseek-r1:8b", label: "DeepSeek R1 8B — reasoning, ~5GB", size: "5GB" },
    { id: "codellama:7b", label: "Code Llama 7B — kod uzmanı, ~4GB", size: "4GB" },
  ];

  const webllm = useWebLLM();

  useEscapeKey(onClose, open);

  // Ollama durumunu kontrol et — ÖNCE SUNUCU PROXY'Sİ üzerinden (aynı-köken, CORS yok),
  // sonra tarayıcıdan direkt. Proxy başarılıysa kullanıcı hiçbir ayar yapmadan bağlanır.
  useEffect(() => {
    if (!open) return;
    async function checkOllama() {
      setOllamaStatus("checking");

      // 1) SUNUCU PROXY — Next.js route'u kullanıcının makinesindeki Ollama'ya bağlanır.
      //    Aynı-köken istek → CORS uygulanmaz → varsayılan Ollama kurulumu yeterli.
      try {
        const res = await fetch("/api/ollama/tags", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data?.status === "online") {
            setOllamaHost(data.host || "http://127.0.0.1:11434");
            setOllamaVia("proxy");
            onOllamaVia?.("proxy");
            onOllamaHost?.(data.host || "http://127.0.0.1:11434");
            setOllamaModels(data.models || []);
            setOllamaStatus("online");
            return;
          }
        }
      } catch {
        /* proxy cevap vermedi — direkt dene */
      }

      const hosts = ["http://localhost:11434", "http://127.0.0.1:11434"];
      // 2) DİREKT tarayıcı bağlantısı (uygulama uzakta + Ollama CORS açıksa çalışır)
      for (const host of hosts) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();

            setOllamaHost(host);
            setOllamaVia("direct");
            onOllamaVia?.("direct");
            setOllamaStatus("online");
            setOllamaModels(data.models?.map((m: any) => m.name) || []);
            return;
          }
        } catch {
          /* sonraki hostu dene */
        }
      }
      // Hiçbir hosta CORS'lu erişilemedi — Ollama ÇALIŞIYOR ama CORS engelliyor olabilir.
      // no-cors probu: opaque response bile gelirse Ollama ayakta demektir.
      let reachable = false;
      for (const host of hosts) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          await fetch(`${host}/api/tags`, { signal: controller.signal, mode: "no-cors" });
          clearTimeout(timeout);
          reachable = true;
          break;
        } catch {
          /* yanit yok */
        }
      }

      setOllamaStatus(reachable ? "cors" : "offline");
      setOllamaModels([]);
    }
    checkOllama();
     
  }, [open, checkNonce]);

  const handleModeChange = (m: "cloud" | "webllm" | "ollama") => {
    setMode(m);
    onModeChange(m);
    if (m === "ollama") {
      onOllamaHost?.(ollamaHost);
      onOllamaVia?.(ollamaVia);
    }
  };

  // Vercel / uzak-deployment çözüm kutusu — CORS açma veya tunnel seçeneği
  const remoteHelpBox = (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <p className="text-xs text-amber-300 mb-2 font-bold">
        Site yayında (Vercel) — Vercel sunucusu kendi PC&apos;ndeki Ollama&apos;ya ulaşamaz 🌐
      </p>
      <p className="text-xs text-zinc-400 mb-2">
        {ollamaStatus === "cors"
          ? "İyi haber: Ollamanız çalışıyor ve tarayıcıdan görünüyor, ama CORS engelledi. Aşağıdaki Çözüm A'yı uygula:"
          : "Ollama'ya hem sunucudan hem tarayıcıdan ulaşılamadı. İki çözüm var:"}
      </p>
      <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside">
        <li>
          <strong className="text-amber-300">Çözüm A — CORS aç (en kolay):</strong> Tepsi ikonuna sağ tıkla → <strong>Quit Ollama</strong>, sonra PowerShell'de BİR KEZ:
          <code className="block mt-1 p-2 rounded bg-zinc-900 text-amber-300 text-[10px] whitespace-pre-wrap">
            {`[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")`}
          </code>
          Ollama'yı Başlat menüsünden tekrar aç → burada "↻ yeniden kontrol et"e bas.
        </li>
        <li>
          <strong className="text-amber-300">Çözüm B — Tunnel (CORS'suz):</strong> PC'nde tunnel aç:
          <code className="block mt-1 p-2 rounded bg-zinc-900 text-amber-300 text-[10px] whitespace-pre-wrap">
            {`cloudflared tunnel --url http://127.0.0.1:11434`}
          </code>
          Vercel → Settings → Environment Variables → <code>OLLAMA_HOSTS</code> = verilen https adresi → Redeploy.
        </li>
      </ol>
    </div>
  );

  // Vercel / uzak-deployment çözüm kutusu — CORS açma veya tunnel seçeneği
  const RemoteHelpBox = (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <p className="text-xs text-amber-300 mb-2 font-bold">
        Site yayında (Vercel) — Vercel sunucusu kendi PC&apos;ndeki Ollama&apos;ya ulaşamaz 🌐
      </p>
      <p className="text-xs text-zinc-400 mb-2">
        {ollamaStatus === "cors"
          ? "İyi haber: Ollamanız çalışıyor ve tarayıcıdan görünüyor, ama CORS engelledi. Aşağıdaki Çözüm A&apos;yı uygula:"
          : "Ollama&apos;ya hem sunucudan hem tarayıcıdan ulaşılamadı. İki çözüm var:"}
      </p>
      <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside">
        <li>
          <strong className="text-amber-300">Çözüm A — CORS aç (en kolay):</strong> Tepsi ikonuna sağ tıkla → <strong>Quit Ollama</strong>, sonra PowerShell&apos;de BİR KEZ:
          <code className="block mt-1 p-2 rounded bg-zinc-900 text-amber-300 text-[10px] whitespace-pre-wrap">
            {`[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")`}
          </code>
          Ollama&apos;yı Başlat menüsünden tekrar aç → burada "↻ yeniden kontrol et"e bas.
        </li>
        <li>
          <strong className="text-amber-300">Çözüm B — Tunnel (CORS&apos;suz):</strong> PC&apos;nde tunnel aç:
          <code className="block mt-1 p-2 rounded bg-zinc-900 text-amber-300 text-[10px] whitespace-pre-wrap">
            {`cloudflared tunnel --url http://127.0.0.1:11434`}
          </code>
          Vercel → Settings → Environment Variables → <code>OLLAMA_HOSTS</code> = verilen https adresi → Redeploy.
        </li>
      </ol>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto nexra-scroll rounded-2xl border border-violet-500/40 bg-[#0a0a0f] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/40 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Yerel AI Motoru</h2>
                  <p className="text-xs text-zinc-500">Kendi donanımınla NEXRA — RAM/GPU/VRAM</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Cloud */}
              <button
                onClick={() => handleModeChange("cloud")}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition",
                  mode === "cloud"
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-violet-300" />
                  <span className="font-bold text-zinc-100">Bulut AI (ZAI API)</span>
                  {mode === "cloud" && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                </div>
                <p className="text-xs text-zinc-500">glm-4.5-flash + glm-4.6 · internet gerekli · rate limit var</p>
              </button>

              {/* WebLLM */}
              <div className={cn(
                "p-4 rounded-xl border transition",
                mode === "webllm" ? "border-cyan-500/60 bg-cyan-500/10" : "border-zinc-800"
              )}>
                <button
                  onClick={() => webllm.webgpuSupported && handleModeChange("webllm")}
                  disabled={!webllm.webgpuSupported}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <HardDrive className="w-5 h-5 text-cyan-300" />
                    <span className="font-bold text-zinc-100">WebLLM (Tarayıcıda)</span>
                    {mode === "webllm" && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                  </div>
                  <p className="text-xs text-zinc-500">
                    WebGPU ile senin GPU/VRAM · offline · 1-3GB model iner · Chrome/Edge 113+
                  </p>
                </button>

                {/* WebGPU kontrol */}
                {webllm.webgpuSupported === false && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-300">
                      WebGPU desteklenmiyor. Chrome/Edge 113+ kullanın veya GPU driver güncelleyin.
                    </p>
                  </div>
                )}

                {/* WebGPU destekliysa */}
                {webllm.webgpuSupported && mode === "webllm" && (
                  <div className="mt-3 space-y-3">
                    {/* Model seçici */}
                    {!webllm.ready && !webllm.loading && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Model seç:</label>
                        <select
                          value={webllm.selectedModel}
                          onChange={(e) => webllm.setSelectedModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                        >
                          {webllm.models.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Yükleme butonu */}
                    {!webllm.ready && !webllm.loading && (
                      <button
                        onClick={() => webllm.loadModel()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition"
                      >
                        <Download className="w-4 h-4" />
                        Model indir ve başlat
                      </button>
                    )}

                    {/* Yükleme progress */}
                    {webllm.loading && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-cyan-300">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {webllm.progressText}
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all"
                            style={{ width: `${webllm.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500">{webllm.progress}%</p>
                      </div>
                    )}

                    {/* Hazır */}
                    {webllm.ready && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-green-300">WebLLM hazır! Artık sohbet edebilirsin.</p>
                      </div>
                    )}

                    {/* Hata */}
                    {webllm.error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                        {webllm.error}
                      </div>
                    )}

                    {/*Unload */}
                    {webllm.ready && (
                      <button
                        onClick={() => {
                          webllm.unload();
                          handleModeChange("cloud");
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 transition"
                      >
                        Modeli kaldır ve buluta dön
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Ollama */}
              <div className={cn(
                "p-4 rounded-xl border transition",
                mode === "ollama" ? "border-amber-500/60 bg-amber-500/10" : "border-zinc-800"
              )}>
                <button
                  onClick={() => ollamaStatus === "online" && handleModeChange("ollama")}
                  disabled={ollamaStatus !== "online"}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Cpu className="w-5 h-5 text-amber-300" />
                    <span className="font-bold text-zinc-100">NEXRA Yerel Motor</span>
                    {mode === "ollama" && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Senin bilgisayarında · offline · sınırsız · en güçlü
                  </p>
                </button>

                {/* Ollama durum */}
                <div className="mt-3">
                  {ollamaStatus === "checking" && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ollama kontrol ediliyor... (NEXRA Yerel motoru: 127.0.0.1:11434)
                    </div>
                  )}
                  {(ollamaStatus === "cors" || ollamaStatus === "offline") && (
                    <button
                      onClick={() => setCheckNonce((n) => n + 1)}
                      className="text-xs text-zinc-500 hover:text-amber-300 transition mb-2 underline"
                    >
                      ↻ yeniden kontrol et
                    </button>
                  )}
                  {ollamaStatus === "online" && (
                    <div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-green-300">
                          NEXRA Yerel çevrimiçi!
                          {ollamaVia === "proxy" && (
                            <span className="text-zinc-500 text-xs ml-1">(sunucu üzerinden — CORS ayarı gerekmez)</span>
                          )}
                          {ollamaVia === "direct" && isRemote && (
                            <span className="text-zinc-500 text-xs ml-1">(tarayıcıdan direkt — OLLAMA_ORIGINS ayarın çalışıyor)</span>
                          )}
                          {ollamaVia === "direct" && !isRemote && (
                            <span className="text-zinc-500 text-xs ml-1">(direkt bağlantı)</span>
                          )}
                        </p>
                      </div>

                      {/* Kurulu modeller */}
                      {ollamaModels.length > 0 && (
                        <div className="mb-3">
                          <label className="text-xs text-zinc-400 mb-1 block font-bold">Kurulu modeller:</label>
                          <select
                            value={ollamaModel}
                            onChange={(e) => {
                              setOllamaModel(e.target.value);
                              onOllamaModel?.(e.target.value);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 mb-2"
                          >
                            {ollamaModels.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-zinc-500">Bu modeller yerel motorun üzerinde çalışır — sohbette hepsi NEXRA olarak konuşur.</p>
                        </div>
                      )}

                      {/* Önerilen modeller — indirilebilir */}
                      <div className="mb-2">
                        <label className="text-xs text-zinc-400 mb-1 block font-bold">Önerilen modeller (indirmek için tıkla):</label>
                        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto nexra-scroll">
                          {OLLAMA_MODEL_SUGGESTIONS.map((m) => {
                            const installed = ollamaModels.includes(m.id);
                            return (
                              <div
                                key={m.id}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                  installed
                                    ? "border-green-500/30 bg-green-500/5"
                                    : "border-zinc-700 bg-zinc-900/50"
                                }`}
                              >
                                <div className="flex-1">
                                  <span className="text-zinc-300">{m.label}</span>
                                  <span className="text-zinc-600 ml-1">({m.size})</span>
                                </div>
                                {installed ? (
                                  <span className="text-green-400 text-[10px]">✓ kurulu</span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      // İndirme komutunu panoya kopyala
                                      navigator.clipboard?.writeText(`ollama run ${m.id}`);
                                      alert(`Terminal'de çalıştır:\n\nollama run ${m.id}\n\n(Komut panoya kopyalandı)`);
                                    }}
                                    className="text-amber-300 hover:text-amber-200 text-[10px] underline"
                                  >
                                    indir
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {ollamaStatus === "cors" && (
                    isRemote ? remoteHelpBox : (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-300 mb-2 font-bold">Ollama çalışıyor AMA tarayıcıdan erişim CORS ile engellendi 🔒</p>
                      <p className="text-xs text-zinc-400 mb-2">
                        Bu durum yerel kullanımda beklenmez (sunucu proxy'si CORS'suz bağlanır). İki seçenek:
                      </p>
                      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside mb-2">
                        <li><strong>Önerilen:</strong> Ollama'yı yeniden başlat, sonra "↻ yeniden kontrol et"e bas (proxy yolu otomatik denenir).</li>
                        <li>Ya da tarayıcıdan direkt bağlantı için Ollama'yı CORS açık başlat — Tepsi ikonuna sağ tıkla → <strong>Quit Ollama</strong>, sonra PowerShell'de BİR KEZ:
                          <code className="block mt-1 p-2 rounded bg-zinc-900 text-amber-300 text-[10px] whitespace-pre-wrap">
                            {"[System.Environment]::SetEnvironmentVariable(\"OLLAMA_ORIGINS\", \"*\", \"User\")"}
                          </code>
                          sonra Ollama'yı Başlat menüsünden tekrar aç.
                        </li>
                      </ol>
                    </div>
                    )
                  )}
                  {ollamaStatus === "offline" && (
                    isRemote ? remoteHelpBox : (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-300 mb-2 font-bold">Ollama bulunamadı (127.0.0.1:11434)</p>
                      <p className="text-xs text-zinc-400 mb-2">
                        Ollama kurulu değil ya da çalışmıyor (sunucu proxy'si + tarayıcı ikisi de erişemedi):
                      </p>
                      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside mb-2">
                        <li>Tepsi ikonunda (saat yanı) Ollama çalışıyor mu? Değilse Başlat menüsünden aç</li>
                        <li>Kurulu değilse: https://ollama.com indir ve kur (kurulumdan sonra otomatik başlar)</li>
                        <li>Model indir: <code className="text-amber-300">ollama run llama3.2</code></li>
                        <li>Sonra bu panelde “↻ yeniden kontrol et”e bas</li>
                      </ol>
                    </div>
                    )
                  )}
                </div>
              </div>

              {/* Bilgi */}
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">Not:</strong> Yerel AI mode'da NEXRA senin donanımınla çalışır — rate limit yok, internet gerekmez (WebLLM ilk indirme hariç). Bulut AI daha güçlü ama rate limit var.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
