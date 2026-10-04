"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// WebLLM — tarayıcıda WebGPU ile LLM çalıştırır
// Kullanıcının GPU/VRAM'ını kullanır, API yok, offline
type WebLLMEngine = any;

const MODEL_OPTIONS = [
  { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", label: "Llama 3.2 1B (hızlı, ~1GB)", size: "1GB" },
  { id: "Llama-3.2-3B-Instruct-q4f32_1-MLC", label: "Llama 3.2 3B (dengeli, ~2GB)", size: "2GB" },
  { id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", label: "Qwen 2.5 1.5B (Türkçe iyi, ~1.5GB)", size: "1.5GB" },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 mini (Microsoft, ~2GB)", size: "2GB" },
  { id: "gemma-2-2b-it-q4f32_1-MLC", label: "Gemma 2 2B (Google, ~2GB)", size: "2GB" },
];

export function useWebLLM() {
  const [engine, setEngine] = useState<WebLLMEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].id);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const engineRef = useRef<WebLLMEngine | null>(null);

  // WebGPU desteğini kontrol et
  useEffect(() => {
    async function checkWebGPU() {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        setWebgpuSupported(!!adapter);
      } catch {
        setWebgpuSupported(false);
      }
    }
    checkWebGPU();
  }, []);

  const loadModel = useCallback(async (modelId?: string) => {
    const model = modelId || selectedModel;
    if (loading || ready) return;

    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressText("WebGPU kontrol ediliyor...");

    try {
      // WebGPU kontrol
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (!adapter) {
        throw new Error("WebGPU desteklenmiyor. Chrome/Edge 113+ kullanın veya GPU driver'ınızı güncelleyin.");
      }

      setProgressText("WebLLM yükleniyor...");
      const { MLCEngine } = await import("@mlc-ai/web-llm");

      setProgressText(`Model indiriliyor: ${model} (~1-3GB)`);
      const eng = new MLCEngine({
        initProgressCallback: (info: any) => {
          setProgress(Math.round((info.progress || 0) * 100));
          setProgressText(info.text || "Yükleniyor...");
        },
      });
      await eng.reload(model);

      engineRef.current = eng;
      setEngine(eng);
      setReady(true);
      setProgress(100);
      setProgressText("Hazır!");
    } catch (err: any) {
      setError(err.message || "WebLLM yüklenemedi");
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, [loading, ready, selectedModel]);

  const chat = useCallback(async (
    messages: { role: string; content: string }[],
    onToken: (token: string) => void,
    onDone: () => void
  ): Promise<void> => {
    if (!engineRef.current) {
      onDone();
      return;
    }

    try {
      // WebLLM streaming
      // Not: küçük tarayıcı modelleri döngüye meyillidir → frequency_penalty ile önlenir,
      // temperature 0.6 tutarlılık için, max_tokens 4096 eksik cevapları önler.
      const chunks = await engineRef.current.chat.completions.create({
        messages: messages as any,
        stream: true,
        temperature: 0.6,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
        max_tokens: 4096,
      });

      for await (const chunk of chunks) {
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          onToken(delta);
        }
      }
      onDone();
    } catch (err: any) {
      onToken(`\n\n[Hata: ${err.message}]`);
      onDone();
    }
  }, []);

  const unload = useCallback(async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.unload();
      } catch {
        // ignore
      }
      engineRef.current = null;
      setEngine(null);
      setReady(false);
      setProgress(0);
      setProgressText("");
    }
  }, []);

  return {
    engine,
    loading,
    progress,
    progressText,
    ready,
    error,
    selectedModel,
    webgpuSupported,
    models: MODEL_OPTIONS,
    loadModel,
    chat,
    unload,
    setSelectedModel,
  };
}
