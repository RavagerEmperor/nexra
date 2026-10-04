import { NextRequest, NextResponse } from "next/server";
import { createZAI } from "@/lib/zai";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limiti

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const prompt: string = (body?.prompt || "").trim();
    const size: "1024x1024" | "768x1344" | "864x1152" | "1344x768" | "1152x864" | "1440x720" | "720x1440" =
      body?.size || "1024x1024";

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "prompt gerekli" }, { status: 400 });
    }

    const zai = await createZAI();
    const result = await zai.images.generations.create({ prompt, size });

    if (!result?.data?.[0]?.base64) {
      return NextResponse.json({ ok: false, error: "gorsel uretilemedi" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      base64: result.data[0].base64,
      prompt,
      ts: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json({ ok: false, error: "gorsel hatasi: " + msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "NEXRA Image Engine" });
}
