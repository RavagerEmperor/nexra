// ZAI SDK fabrikası — Vercel / serverless uyumlu.
//
// Sorun: z-ai-web-dev-sdk yapılandırmayı SADECE dosyadan okur
// (.z-ai-config → cwd → home → /etc). Vercel'de bu dosya yoktur ve
// gizli anahtar GitHub'a konulmamalıdır.
//
// Çözüm: ZAI_API_KEY + ZAI_BASE_URL ortam değişkenleri tanımlıysa
// SDK sınıfını doğrudan config ile örnekliyoruz (dosya aramadan).
// Değişkenler yoksa SDK varsayılan davranışıyla (lokal .z-ai-config) çalışır.
//
// Vercel ayarı (Settings → Environment Variables):
//   ZAI_API_KEY  = <api anahtarın>
//   ZAI_BASE_URL = https://api.z.ai/api/paas/v4   (veya bigmodel: https://open.bigmodel.cn/api/paas/v4)

import ZAI from "z-ai-web-dev-sdk";

export type ZAIClient = Awaited<ReturnType<typeof ZAI.create>>;

export async function createZAI(): Promise<ZAIClient> {
  const apiKey = process.env.ZAI_API_KEY?.trim();
  const baseUrl = process.env.ZAI_BASE_URL?.trim();

  if (apiKey && baseUrl) {
    // Serverless dostu: dosyaya yazmadan, config'i doğrudan ver.
    // (ZAI sınıfı default export'tur; create() yalnızca loadConfig() + new ZAI(config) yapar.)
    const Ctor = ZAI as unknown as new (cfg: Record<string, string>) => ZAIClient;
    return new Ctor({ baseUrl, apiKey });
  }

  // Lokal geliştirme: .z-ai-config dosyasından oku (mevcut davranış)
  return ZAI.create();
}

export default createZAI;
