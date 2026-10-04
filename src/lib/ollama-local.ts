// Ollama yerel bağlantı yardımcıları — SUNUCU TARAFI (Next.js route'ları için)
//
// Mimari karar (kritik): Tarayıcı → Ollama bağlantısı cross-origin olduğu için
// CORS ister (OLLAMA_ORIGINS="*" şarttı). Bunun yerine tarayıcı → aynı-köken
// Next.js route'u → Ollama şeklinde PROXY kullanıyoruz. Sunucu-sunucu isteklerde
// CORS kuralı uygulanmaz, böylece kullanıcı Windows'ta HİÇBİR AYAR YAPMADAN
// varsayılan Ollama kurulumuyla bağlanabilir.
//
// Vercel senaryosu: Vercel sunucusu senin bilgisayarındaki 127.0.0.1:11434'e
// ULAŞAMAZ (o adres yalnızca kendi ağınızdadır). İki çözüm:
//   1) Panel tarayıcıdan DİREKT bağlanmayı dener (OLLAMA_ORIGINS="*" şart)
//   2) OLLAMA_HOSTS env değişkenine tunnel adresi verilir (cloudflared/ngrok),
//      proxy bu adrese bağlanır → CORS'a hiç gerek kalmaz.
//      Örn: OLLAMA_HOSTS=https://benim-tunnelim.trycloudflare.com

export const OLLAMA_PORT = 11434;

// Denenecek host adayları — sıra önemli: 127.0.0.1 en güvenilir (IPv4,
// Ollama Windows'ta varsayılan olarak 127.0.0.1'e bağlanır), localhost
// IPv6'ya (::1) çözülebilir, o yüzden ayrıca [::1] de denenir.
export const OLLAMA_HOST_CANDIDATES = [
  `http://127.0.0.1:${OLLAMA_PORT}`,
  `http://localhost:${OLLAMA_PORT}`,
  `http://[::1]:${OLLAMA_PORT}`,
];

export type OllamaHostCheck = {
  ok: boolean;
  host: string | null;
  models: string[];
  error?: string;
};

/** OLLAMA_HOSTS env değişkeninden yönetici-tanımlı hostları oku (tunnel senaryosu) */
export function getEnvOllamaHosts(): string[] {
  const raw = process.env.OLLAMA_HOSTS || "";
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const h = part.trim().replace(/\/+$/, "");
    if (!h) continue;
    try {
      const u = new URL(h);
      if (u.protocol === "http:" || u.protocol === "https:") {
        if (!out.includes(h)) out.push(h);
      }
    } catch {
      // geçersiz girdiyi sessizce yoksay
    }
  }
  return out;
}

/** Uygulama Vercel gibi uzak bir platformda mı çalışıyor? */
export function isVercelLike(): boolean {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
}

/** Verilen hosta tek seferlik /api/tags sorgusu (kısa timeout'lu) */
async function probeHost(host: string, timeoutMs: number): Promise<{ ok: boolean; models: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${host}/api/tags`, {
      signal: controller.signal,
      // Node'un kendi fetch'i — cache'e takılma, her seferinde gerçek kontrol
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, models: [] };
    const data = await res.json();
    const models: string[] = Array.isArray(data?.models)
      ? data.models.map((m: { name?: string }) => m?.name).filter(Boolean)
      : [];
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ollama'yı aday hostlarda sırayla ara. İlk yanıt veren hostu döner.
 * Öncelik: client'ın bildiği host (whitelist'teyse) → env hostları (OLLAMA_HOSTS,
 * tunnel) → 127.0.0.1 → localhost → [::1]
 */
export async function detectOllama(preferredHost?: string | null): Promise<OllamaHostCheck> {
  const candidates: string[] = [];

  if (preferredHost && isClientAllowedOllamaHost(preferredHost)) {
    candidates.push(stripTrailingSlash(preferredHost));
  }
  for (const c of [...getEnvOllamaHosts(), ...OLLAMA_HOST_CANDIDATES]) {
    if (!candidates.includes(c)) candidates.push(c);
  }

  let lastError = "Ollama hiçbir yerel adayda bulunamadı (127.0.0.1 / localhost / ::1 :11434)";
  for (const host of candidates) {
    const r = await probeHost(host, 2000);
    if (r.ok) return { ok: true, host, models: r.models };
    lastError = `${host} yanıt vermedi`;
  }
  return { ok: false, host: null, models: [], error: lastError };
}

/**
 * SSRF koruması (istemci kaynaklı hostlar için): yalnızca yerel adresler
 * (127.0.0.1, localhost, ::1) VEYA yöneticinin OLLAMA_HOSTS ile beyazlisteye
 * aldığı adresler kabul edilir.
 */
export function isClientAllowedOllamaHost(host: string): boolean {
  if (isLocalOllamaHost(host)) return true;
  const envHosts = getEnvOllamaHosts();
  if (envHosts.length === 0) return false;
  try {
    const norm = stripTrailingSlash(host.trim());
    return envHosts.some((h) => h === norm);
  } catch {
    return false;
  }
}

/** SSRF koruması: yalnızca yerel adreslere izin ver (127.0.0.1, localhost, ::1) */
export function isLocalOllamaHost(host: string): boolean {
  try {
    const u = new URL(host);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "127.0.0.1" ||
      h === "localhost" ||
      h === "::1" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function stripTrailingSlash(h: string): string {
  return h.endsWith("/") ? h.slice(0, -1) : h;
}

/** Vercel'de Ollama proxy'si çalışmadığında gösterilecek çözüm metni */
export function vercelOllamaHint(): string {
  return (
    "Bu site Vercel'de yayında — Vercel sunucusu SENİN bilgisayarındaki Ollama'ya ulaşamaz " +
    "(127.0.0.1 sunucunun kendisidir). İki çözüm:\n\n" +
    "**Çözüm A (en kolay):** Ollama'yı CORS açık yeniden başlat — panel tarayıcıdan direkt bağlanır.\n" +
    "PowerShell'de BİR KEZ:\n" +
    "```\n" +
    '[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")\n' +
    "```\n" +
    "Sonra Ollama'yı kapat-aç ve panelde \"↻ yeniden kontrol et\"e bas.\n\n" +
    "**Çözüm B (CORS'suz):** Bilgisayarında tunnel aç ve Vercel'e bildir:\n" +
    "```\n" +
    "cloudflared tunnel --url http://127.0.0.1:11434\n" +
    "```\n" +
    "Vercel → Settings → Environment Variables → `OLLAMA_HOSTS` = verilen https adresi, sonra redeploy et."
  );
}
