import { NextRequest, NextResponse } from "next/server";
import { createZAI } from "@/lib/zai";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limiti

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const prompt: string = (body?.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "prompt gerekli" }, { status: 400 });
    }

    const zai = await createZAI();
    const createRes = await zai.video.generations.create({
      prompt,
      quality: "speed",
      with_audio: false,
      duration: 10,
    });

    const taskId = createRes?.id;
    if (!taskId) {
      return NextResponse.json({ ok: false, error: "video task olusturulamadi" }, { status: 502 });
    }

    // Poll for result (max ~120s)
    const started = Date.now();
    const MAX_WAIT = 120000;
    const POLL_INTERVAL = 5000;
    let videoUrl: string | null = null;

    while (Date.now() - started < MAX_WAIT) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      try {
        const status = await zai.async.result.query(taskId);
        if (status?.task_status === "SUCCESS") {
          videoUrl =
            status?.video_url ||
            status?.url ||
            (status?.video as any)?.[0]?.url ||
            status?.video_result?.[0]?.url ||
            null;
          if (videoUrl) break;
        }
        if (status?.task_status === "FAIL") {
          return NextResponse.json({ ok: false, error: "video uretimi basarisiz" }, { status: 502 });
        }
      } catch {
        /* keep polling */
      }
    }

    if (!videoUrl) {
      return NextResponse.json({
        ok: false,
        error: "video uretimi zaman asimi (120sn). tekrar dene.",
        taskId,
      }, { status: 504 });
    }

    return NextResponse.json({
      ok: true,
      videoUrl,
      prompt,
      ts: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json({ ok: false, error: "video hatasi: " + msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "NEXRA Video Engine" });
}
