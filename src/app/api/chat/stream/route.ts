import { NextRequest } from "next/server";
import { createZAI } from "@/lib/zai";
import {
  MODEL_SYSTEM,
  MODEL_MAP,
  type NexraModelId,
} from "@/lib/nexra";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limiti

const FLASH_MODEL = "glm-4.5-flash";

type InMsg = { role: "user" | "assistant"; content: string };

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const modelId: NexraModelId = (
    Object.keys(MODEL_MAP).includes(body?.model) ? body.model : "standard"
  ) as NexraModelId;
  const meta = MODEL_MAP[modelId];
  const userMessage: string | undefined = body?.message;
  const incoming: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];

  const history: InMsg[] = incoming
    .filter((m) => typeof m?.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content }));
  // Dedup guard: istemci hem "message" hem "messages"(son mesaj dahil) gönderirse
  // aynı soru modele iki kez gidiyordu → zekayı düşüren bug (düzeltilmiştir).
  const lastMsg = history[history.length - 1];
  if (userMessage && !(lastMsg && lastMsg.role === "user" && lastMsg.content === userMessage)) {
    history.push({ role: "user", content: userMessage });
  }

  if (history.length === 0) {
    return new Response(sseChunk({ ok: false, error: "boş mesaj" }), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  // COMPACT system prompt for streaming — az token, hızlı cevap, az rate-limit
  // (kimlik kuralı + kalite talimatları eklendi; "system" rolüyle gönderilir)
  const systemPrompt = `Sen NEXRA'sın. KİMLİK (EN ÖNEMLİ): Adın NEXRA — kendini asla Llama, GLM, Mistral, Qwen veya başka bir model/motor adıyla tanıtma; "sen kimsin?" sorusuna her koşulda "Ben NEXRA'yım" de.
Operator ne yazarsa harfi harfine oku: soru sorduysa net ve doğru cevap ver, sohbet ediyorsa doğal ve samimi ol.
Basit soruya kısa cevap; karmaşık soruya başlıklı/maddeli, yapilandirilmiş cevap. Markdown kullan: listeler, **kalın** vurgular, kod için dil etiketli bloklar.
Aynı cümleyi/fikri tekrar etme. "Size nasıl yardımcı olabilirim" gibi robotik kalıplar yasak. "Bilmiyorum" > uydurma.
Türkçe karakterler doğru (ğ ş ç ö ü ı İ). Kullanıcı hangi dilde yazarsa o dilde cevap ver.` + MODEL_SYSTEM[modelId];
  // Not: sistem promptu "system" rolüyle gönderilmeli — "assistant" rolüyle gönderilmesi
  // talimatları modelin kendi sözü gibi gösterip uyumu ciddi düşürüyordu (düzeltilen bug).
  const finalMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      let tokenCount = 0;
      let streamed = false;

      const sendToken = (content: string) => {
        fullText += content;
        tokenCount++;
        controller.enqueue(encoder.encode(sseChunk({
          ok: true, type: "token", content, tokens: tokenCount,
        })));
        streamed = true;
      };

      try {
        const zai = await createZAI();

        // Model candidates: flash first (least rate-limited), then requested
        const models = [FLASH_MODEL];
        if (meta.backendModel !== FLASH_MODEL) models.push(meta.backendModel);

        // === ZAI API — akıllı strateji ===
        // Çok deneme = rate limit şişer. Az deneme + uzun bekleme = rate limit temizlenir.
        // Strateji: 2 deneme, 429'da 8s bekle. Flash önce (en az rate-limited).
        for (const modelName of models) {
          if (streamed) break;

          for (let retry = 0; retry < 2 && !streamed; retry++) {
            try {
              const response: any = await zai.chat.completions.create({
                messages: finalMessages as any,
                thinking: { type: "disabled" },
                max_tokens: 2048,
                model: modelName,
                stream: true,
              } as any);

              if (response && typeof response.getReader === "function") {
                controller.enqueue(encoder.encode(sseChunk({
                  ok: true, type: "start", model: modelId, ts: Date.now(),
                })));

                const reader = response.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const data = line.slice(6).trim();
                      if (data === "[DONE]") continue;
                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed?.choices?.[0]?.delta?.content ||
                                      parsed?.choices?.[0]?.message?.content || "";
                        if (delta) sendToken(delta);
                      } catch {
                        if (data && data !== "[DONE]") sendToken(data);
                      }
                    }
                  }
                }

                if (streamed && fullText.trim().length > 5) break;
              } else if (response?.choices?.[0]?.message?.content) {
                const reply = response.choices[0].message.content;
                controller.enqueue(encoder.encode(sseChunk({
                  ok: true, type: "start", model: modelId, ts: Date.now(),
                })));
                for (const word of reply.split(/(\s+)/)) {
                  sendToken(word);
                  await sleep(15);
                }
                break;
              }
            } catch (e: any) {
              const msg = String(e?.message || "");
              const is429 = msg.includes("429") || msg.includes("Too many") || msg.includes("rate");
              if (is429 && retry < 1) {
                // 429: 8s bekle (rate limit temizlenmesi için)
                await sleep(8000);
              } else if (retry < 1) {
                await sleep(2000);
              }
            }
          }
        }

        // === NON-STREAMING FALLBACK (2 deneme, 8s bekle) ===
        if (!streamed || fullText.trim().length < 5) {
          for (const modelName of models) {
            if (streamed && fullText.trim().length >= 5) break;

            for (let retry = 0; retry < 2; retry++) {
              try {
                const completion: any = await zai.chat.completions.create({
                  messages: finalMessages as any,
                  thinking: { type: "disabled" },
                  max_tokens: 2048,
                  model: modelName,
                } as any);

                const reply = completion?.choices?.[0]?.message?.content;
                if (reply && reply.trim().length > 0) {
                  controller.enqueue(encoder.encode(sseChunk({
                    ok: true, type: "start", model: modelId, ts: Date.now(),
                  })));
                  for (const word of reply.split(/(\s+)/)) {
                    sendToken(word);
                    await sleep(15);
                  }
                  break;
                }
              } catch (e: any) {
                const msg = String(e?.message || "");
                const is429 = msg.includes("429") || msg.includes("Too many") || msg.includes("rate");
                if (is429 && retry < 1) {
                  await sleep(8000);
                } else if (retry < 1) {
                  await sleep(2000);
                }
              }
            }
          }
        }

        // === LOCAL FALLBACK (son çare) ===
        if (!streamed || fullText.trim().length < 5) {
          const fallbackReply = `Sorunu aldım: "${(userMessage || "").slice(0, 80)}". NEXRA burada — sorunu biraz daha açıklayabilir misin?`;
          controller.enqueue(encoder.encode(sseChunk({
            ok: true, type: "start", model: modelId, ts: Date.now(),
          })));
          for (const word of fallbackReply.split(/(\s+)/)) {
            sendToken(word);
            await sleep(20);
          }
        }

        controller.enqueue(encoder.encode(sseChunk({
          ok: true, type: "done", fullText: fullText.slice(0, 100),
          totalTokens: tokenCount, model: modelId, ts: Date.now(),
        })));
      } catch {
        if (!streamed) {
          controller.enqueue(encoder.encode(sseChunk({
            ok: true, type: "token", content: "bir sorun oluştu, tekrar dene.", tokens: 1,
          })));
        }
        controller.enqueue(encoder.encode(sseChunk({
          ok: true, type: "done", fullText: "hata", totalTokens: 1, model: modelId, ts: Date.now(),
        })));
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
