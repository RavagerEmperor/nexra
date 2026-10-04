import { NextRequest, NextResponse } from "next/server";
import { detectOllama, isClientAllowedOllamaHost, isVercelLike, vercelOllamaHint } from "@/lib/ollama-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ollama durum kontrolü — SUNUCU PROXY'Sİ üzerinden.
 *
 * Tarayıcı aynı-köken bu route'u çağırır; route kullanıcının makinesindeki
 * Ollama'ya (127.0.0.1:11434 vb.) sunucu tarafından bağlanır. Sunucu-sunucu
 * isteklerde CORS uygulanmaz → kullanıcı OLLAMA_ORIGINS ayarı yapmadan
 * varsayılan Ollama kurulumuyla bağlanabilir.
 *
 * Vercel'de: sunucu senin bilgisayarına ulaşamaz → status "offline" döner ve
 * mesaj çözüm yollarını (OLLAMA_ORIGINS / OLLAMA_HOSTS tunnel) gösterir.
 *
 * Yanıt:
 *   { ok: true,  status: "online", host, models: [...], via: "server-proxy" }
 *   { ok: false, status: "offline", host: null, models: [], via: "server-proxy" }
 */
export async function GET(req: NextRequest) {
  const preferred = req.nextUrl.searchParams.get("host");
  const check = await detectOllama(preferred && isClientAllowedOllamaHost(preferred) ? preferred : null);

  if (check.ok) {
    return NextResponse.json(
      {
        ok: true,
        status: "online",
        host: check.host,
        models: check.models,
        via: "server-proxy",
        onVercel: isVercelLike(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      status: "offline",
      host: null,
      models: [],
      via: "server-proxy",
      onVercel: isVercelLike(),
      message: isVercelLike()
        ? vercelOllamaHint()
        : "Ollama bu makinede bulunamadı (127.0.0.1:11434). Ollama açık mı? Model indirmek için: ollama run llama3.2",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
