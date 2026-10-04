import { NextRequest, NextResponse } from "next/server";
import { createZAI } from "@/lib/zai";
import {
  NEXRA_CORE,
  MODEL_SYSTEM,
  MODEL_MAP,
  type NexraModelId,
  type MemoryEntry,
} from "@/lib/nexra";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limiti

type InMsg = { role: "user" | "assistant"; content: string };

async function callZai(
  messages: { role: string; content: string }[],
  opts: { model?: string; thinking?: boolean } = {}
): Promise<string> {
  const zai = await createZAI();
  const thinking = opts.thinking ? { type: "enabled" as const } : { type: "disabled" as const };
  const baseBody: Record<string, unknown> = {
    messages: messages as unknown,
    thinking,
    max_tokens: 32000,
  };
  if (opts.model) baseBody.model = opts.model;

  try {
    const completion = await zai.chat.completions.create(baseBody as any);
    const txt = completion?.choices?.[0]?.message?.content;
    if (txt && txt.trim()) return txt;
  } catch {
    /* fall through */
  }
  if (opts.model) {
    try {
      const completion = await zai.chat.completions.create({
        messages: messages as unknown,
        thinking,
        max_tokens: 32000,
      } as any);
      const txt = completion?.choices?.[0]?.message?.content;
      if (txt && txt.trim()) return txt;
    } catch {
      /* fall through */
    }
  }
  const completion = await zai.chat.completions.create({
    messages: messages as unknown,
    thinking: { type: "disabled" },
    max_tokens: 32000,
  } as any);
  const txt = completion?.choices?.[0]?.message?.content;
  if (!txt || !txt.trim()) throw new Error("model bos dondu");
  return txt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const modelIds: NexraModelId[] = Array.isArray(body?.models) ? body.models : [];
    const strategy: "cascade" | "parallel" | "ensemble" = body?.strategy || "cascade";
    const incoming: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];
    const userMessage: string | undefined = body?.message;
    const memory: MemoryEntry[] = Array.isArray(body?.memory) ? body.memory : [];

    let history: InMsg[] = incoming
      .filter((m) => typeof m?.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m) => ({ role: m.role, content: m.content }));
    // Dedup guard: son mesaj zaten aynı user mesajıysa tekrar ekleme
    const lastMsg = history[history.length - 1];
    if (userMessage && !(lastMsg && lastMsg.role === "user" && lastMsg.content === userMessage)) {
      history.push({ role: "user", content: userMessage });
    }
    history = history.slice(-30);

    if (modelIds.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Birlestirme icin en az 2 model gerekli." },
        { status: 400 }
      );
    }
    if (modelIds.length > 4) {
      return NextResponse.json(
        { ok: false, error: "Maksimum 4 model birlestirilebilir." },
        { status: 400 }
      );
    }

    const validModels = modelIds.filter((id) => MODEL_MAP[id]);
    if (validModels.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Gecerli en az 2 model gerekli." },
        { status: 400 }
      );
    }

    let memCtx = "";
    if (memory.length > 0) {
      const memLines = memory.slice(0, 30).map((m) => `- [${m.category}] ${m.text}`).join("\n");
      memCtx = `\n\n--- OPERATOR HAFIZASI ---\n${memLines}\n--- HAFIZA SONU ---\n`;
    }

    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ ok: false, error: "Kullanici mesaji yok." }, { status: 400 });
    }

    const modelNames = validModels.map((id) => MODEL_MAP[id].label).join(" + ");

    // -----------------------------------------------------------------------
    // CASCADE: 1. dusunur, 2. gelistirir, 3. finalize
    // -----------------------------------------------------------------------
    if (strategy === "cascade") {
      let accumulated = "";
      const traces: { model: string; output: string }[] = [];

      for (let i = 0; i < validModels.length; i++) {
        const id = validModels[i];
        const meta = MODEL_MAP[id];
        const isLast = i === validModels.length - 1;
        const isFirst = i === 0;

        const prompt = isFirst
          ? lastUser.content + memCtx
          : `Onceki model (${MODEL_MAP[validModels[i - 1]].label}) su cevabi uretti:\n\n${accumulated}\n\nSen ${meta.label} olarak bunu gelistir/finalize et. Soru: ${lastUser.content}`;

        const sys = NEXRA_CORE + MODEL_SYSTEM[id] + `\n\nBu BIRLESTIRILMIS modelin ${i + 1}. adimi. ${isLast ? "Final cevabi uret." : "Ara adim: dusun ve taslak uret."}`;

        const messages = [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ];

        const out = await callZai(messages, {
          model: meta.backendModel,
          thinking: meta.thinking,
        });
        accumulated = out;
        traces.push({ model: meta.label, output: out.slice(0, 500) });
      }

      return NextResponse.json({
        ok: true,
        reply: accumulated,
        strategy,
        models: validModels.map((id) => MODEL_MAP[id].label),
        modelNames,
        traces,
        ultraThink: true,
        ts: Date.now(),
      });
    }

    // -----------------------------------------------------------------------
    // PARALLEL / ENSEMBLE: tum modeller cevaplar, sentez modeli birlestirir
    // -----------------------------------------------------------------------
    const responses: { model: string; output: string }[] = [];
    await Promise.all(
      validModels.map(async (id) => {
        const meta = MODEL_MAP[id];
        const sys = NEXRA_CORE + MODEL_SYSTEM[id] + memCtx;
        const messages = [
          { role: "system", content: sys },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ];
        try {
          const out = await callZai(messages, {
            model: meta.backendModel,
            thinking: meta.thinking,
          });
          responses.push({ model: meta.label, output: out });
        } catch {
          responses.push({ model: meta.label, output: "[hata]" });
        }
      })
    );

    // sentez
    const synthPrompt = `Soru: ${lastUser.content}

Asagida birden fazla NEXRA varyantinin cevabi var. Bunlari sentezle, en iyi yaniti uret. Tekrarlari kaldir, en guclu noktalari birlestir.

${responses
  .map((r, i) => `### ${r.model} cevabi:\n${r.output}`)
  .join("\n\n---\n\n")}

Sentezlenmis, kapsamli, derin final cevap uret. [NEXRA] etiketi ile basla.`;

    const synthSys =
      NEXRA_CORE +
      `\n\nSen NEXRA Synthesis'sin. Birden fazla varyantin cevabini birlestirip ultra sentez uretiyorsun. En iyi noktalari al, tekrarlari kaldir, derinlestir.`;

    const finalOut = await callZai(
      [
        { role: "system", content: synthSys },
        { role: "user", content: synthPrompt },
      ],
      { model: "glm-4.6", thinking: true }
    );

    return NextResponse.json({
      ok: true,
      reply: finalOut,
      strategy,
      models: validModels.map((id) => MODEL_MAP[id].label),
      modelNames,
      traces: responses.map((r) => ({ model: r.model, output: r.output.slice(0, 500) })),
      ultraThink: true,
      ts: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json(
      { ok: false, error: "Merge hatasi: " + msg },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "NEXRA Merge Engine",
    strategies: ["cascade", "parallel", "ensemble"],
    maxModels: 4,
    minModels: 2,
  });
}
