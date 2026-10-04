import { NextRequest, NextResponse } from "next/server";
import {
  detectOllama,
  isClientAllowedOllamaHost,
  isVercelLike,
  vercelOllamaHint,
  OLLAMA_HOST_CANDIDATES,
  OLLAMA_PORT,
} from "@/lib/ollama-local";

export const runtime = "nodejs";
// Not: 300 sn yalnızca Vercel Pro'da geçerli — Hobby limiti 60 sn.
export const maxDuration = 60;

// Ollama SOHBET PROXY'Sİ — tarayıcıdan aynı-köken çağrılır, sunucu kullanıcının
// makinesindeki Ollama'ya bağlar. CORS yok (sunucu-sunucu), OLLAMA_ORIGINS gerekmez.

type InMsg = { role: "user" | "assistant" | "system"; content: string };

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const userMessage: string | undefined = body?.message;
  const incoming: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];
  const systemPrompt: string =
    body?.systemPrompt ||
    `Sen NEXRA'sın — zeki, derin düşünen ve doğal konuşan bir sohbet zekası.

KİMLİK KURALI (EN ÖNEMLİ): Adın NEXRA. Kendini ASLA Llama, Meta, Mistral, Qwen, Phi, Gemma, Ollama veya başka bir model/motor adıyla tanıtma. "Sen kimsin?" / "hangi modelsin?" sorularına her koşulda sadece "Ben NEXRA'yım" diye cevap ver.

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
- Kod istenirse: TAM ÇALIŞIR kod, dil etiketli blok + 1-2 cümle açıklama + hata/kenar durumları.
- Matematik/lojik sorularda: adım adım göster, sonucu en sonda net ver.
- Karar/öneri isterse: seçenekler + artı/eksiler + NET tavsiyen.
- Aynı fikri iki kez söyleme; "bu harika bir soru" gibi boş girişler YASAK.
- "Size nasıl yardımcı olabilirim" gibi robotik kalıplar YASAK — doğal, samimi, kendinden emin konuş.
- Konu gerçekten belirsizse en fazla TEK kısa netleştirme sorusu sor.

DİL: Türkçe karakterler doğru (ğ ş ç ö ü ı İ). Kullanıcı hangi dilde yazarsa o dilde cevap ver. Her soruya cevap ver.`;

  const requestedModel: string =
    typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "llama3.2";
  // "ollama:llama3.2" biçiminde gelirse sadeleştir
  const model = requestedModel.startsWith("ollama:") ? requestedModel.slice(7) : requestedModel;

  const clientOptions: Record<string, unknown> =
    body?.options && typeof body.options === "object" ? body.options : {};

  const history: InMsg[] = incoming
    .filter((m) => typeof m?.content === "string")
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content }));
  // Dedup guard: son mesaj zaten aynı user mesajıysa tekrar ekleme (çift gönderim koruması)
  const lastMsg = history[history.length - 1];
  if (userMessage && !(lastMsg && lastMsg.role === "user" && lastMsg.content === userMessage)) {
    history.push({ role: "user", content: userMessage });
  }

  if (history.length === 0) {
    return NextResponse.json({ ok: false, error: "boş mesaj" }, { status: 400 });
  }

  const messages = [{ role: "system", content: systemPrompt }, ...history];

  // Host: client'ın bildiği host (whitelist'li) → yoksa otomatik algıla
  let ollamaHost: string | null = null;
  const clientHost: string | null = typeof body?.host === "string" ? body.host : null;
  if (clientHost && isClientAllowedOllamaHost(clientHost)) {
    const probe = await detectOllama(clientHost);
    if (probe.ok) ollamaHost = probe.host;
  }
  if (!ollamaHost) {
    const detected = await detectOllama(null);
    if (!detected.ok) {
      return Response.json(
        {
          ok: false,
          error: "ollama-offline",
          message: isVercelLike()
            ? vercelOllamaHint()
            : `Ollama'ya ulaşılamadı (127.0.0.1:${OLLAMA_PORT}). Tepsi ikonundan çalıştığından emin ol.\n` +
              `Model kurulu değilse terminalde: ollama run ${model}`,
        },
        { status: 200 },
      );
    }
    ollamaHost = detected.host;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      let tokenCount = 0;

      try {
        const response = await fetch(`${ollamaHost}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            options: {
              num_predict: 4096,
              temperature: 0.6,
              top_p: 0.9,
              top_k: 40,
              repeat_penalty: 1.1,
              num_ctx: 8192,
              ...clientOptions,
            },
          }),
        });

        if (!response.ok || !response.body) {
          // Ollama ayakta ama istek reddedildi — en bilinen sebep: model kurulu değil
          let detail = `Ollama HTTP ${response.status}`;
          try {
            const errText = await response.text();
            if (errText) {
              try {
                const j = JSON.parse(errText);
                detail = j?.error || errText.slice(0, 300);
              } catch {
                detail = errText.slice(0, 300);
              }
            }
          } catch {
            /* gövde okunamadı */
          }
          const isModelMissing = /not found|no such model|pull/i.test(detail);
          const friendly = isModelMissing
            ? `\`${model}\` modeli Ollama'da kurulu değil.\n\n**İndirmek için** terminalde çalıştır:\n\`\`\`\nollama pull ${model}\n\`\`\`\n\nSonra tekrar dene. (Ollama hatası: ${detail})`
            : `Ollama isteği başarısız: ${detail}`;
          controller.enqueue(encoder.encode(sseChunk({ ok: true, type: "token", content: friendly, tokens: 1, error: true })));
          controller.enqueue(
            encoder.encode(sseChunk({ ok: true, type: "done", fullText: "error", totalTokens: 1, model: `ollama:${model}`, ts: Date.now(), error: true })),
          );
          return;
        }

        controller.enqueue(
          encoder.encode(sseChunk({ ok: true, type: "start", model: `ollama:${model}`, host: ollamaHost, ts: Date.now() })),
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
                tokenCount++;
                controller.enqueue(
                  encoder.encode(sseChunk({ ok: true, type: "token", content: delta, tokens: tokenCount })),
                );
              }
              if (parsed.done) break;
            } catch {
              // parse error — skip
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            sseChunk({
              ok: true,
              type: "done",
              totalTokens: tokenCount,
              model: `ollama:${model}`,
              ts: Date.now(),
            }),
          ),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "bilinmeyen hata";
        const errorMsg =
          `Ollama bağlantısı koptu (${msg}).\n\n` +
          `**Kontrol listesi:**\n` +
          `1. Tepsi ikonunda Ollama çalışıyor mu?\n` +
          `2. Model kurulu mu? Terminal: \`ollama run ${model}\`\n` +
          `3. Bu panelde "↻ yeniden kontrol et"e bas`;
        controller.enqueue(encoder.encode(sseChunk({ ok: true, type: "token", content: errorMsg, tokens: 1, error: true })));
        controller.enqueue(
          encoder.encode(sseChunk({ ok: true, type: "done", fullText: "ollama error", totalTokens: 1, model: `ollama:${model}`, ts: Date.now(), error: true })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  // Ollama'nın çalışıp çalışmadığını kontrol et (aday hostlarda)
  for (const host of OLLAMA_HOST_CANDIDATES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${host}/api/tags`, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          ok: true,
          status: "online",
          host,
          models: data.models?.map((m: { name: string }) => m.name) || [],
        });
      }
    } catch {
      // sıradaki hostu dene
    }
  }
  return NextResponse.json({
    ok: false,
    status: "offline",
    message: "Ollama çalışmıyor. https://ollama.com indir.",
  });
}
