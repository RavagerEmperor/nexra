# NEXRA — Yerel AI + Bulut AI Sohbet Platformu

NEXRA, üç AI motorunu tek arayüzde birleştiren sohbet uygulamasıdır:

| Motor | Nerede çalışır | İnternet | Sınır |
|-------|----------------|----------|-------|
| **Bulut AI** (GLM) | ZAI API | Gerekli | Rate limit |
| **WebLLM** | Tarayıcıda (WebGPU) | Gerekmez (ilk indirme sonrası) | GPU/VRAM |
| **NEXRA Yerel** (Ollama) | Kendi bilgisayarın | Gerekmez | Yok — donanımın kadar |

> Yerel motor sohbette **her zaman NEXRA kimliğiyle** konuşur — arka planda hangi model (Llama, Qwen, Mistral...) çalıştığı kullanıcıya yansımaz.

## Özellikler

- 51+ AI model profili (flash, standard, reasoner, coder, prime, ultra_prime…)
- Streaming SSE — kelimeler canlı akar
- Kod/oyun üretimi (`kod:`, `oyun:` önekleri)
- Görsel, video ve animasyon üretimi (Bulut AI)
- Web araştırma (ARA modu)
- Google OAuth girişi
- Sıfır-ayar yerel motor: sunucu proxy'si sayesinde **CORS ayarı gerektirmez**
- Vercel uyumlu: yayındaki site kendi PC'ndeki motora bağlanabilir (aşağıda)

## Hızlı Başlangıç (Yerel)

```bash
# 1) Bağımlılıklar (Prisma client otomatik üretilir)
npm install

# 2) Veritabanı (bir kez)
npm run setup

# 3) Çalıştır
npm run dev
```

→ http://localhost:3000 — sağ üstteki **"yerel AI"** düğmesi → **NEXRA Yerel Motor**.

Ayrıntılı kurulum: [KURULUM.md](./KURULUM.md) · Vercel dağıtımı: [DEPLOY.md](./DEPLOY.md)

## Vercel + Yerel Motor Nasıl Çalışır?

Siteniz Vercel'de yayındayken Ollama'nız kendi bilgisayarınızda olur. İki yol:

**Yol A — Tarayıcıdan direkt (en kolay):** Ollama'yı bir kez CORS açık başlatın:

```powershell
# Windows — PowerShell'de BİR KEZ çalıştır, sonra Ollama'yı kapat-aç
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
```

Panel otomatik olarak tarayıcıdan direkt bağlanır.

**Yol B — Tunnel (CORS'a hiç dokunmadan):** Kendi PC'nizde tunnel açın, adresini Vercel'e bildirin:

```bash
cloudflared tunnel --url http://127.0.0.1:11434
```

Vercel → Settings → Environment Variables → `OLLAMA_HOSTS=https://<tunnel-adresi>` → Redeploy.
Artık proxy yolu da çalışır; Ollama'nızın CORS ayarıyla oynamanız gerekmez.

## Ortam Değişkenleri

| Değişken | Nerede | Ne işe yarar |
|----------|--------|--------------|
| `DATABASE_URL` | lokal (`.env`) | Prisma/SQLite yolu (opsiyonel — sohbetler tarayıcıda saklanır) |
| `ZAI_API_KEY` | Vercel | Bulut AI modu için (yerel modda gerekmez) |
| `ZAI_BASE_URL` | Vercel | Bulut AI API adresi (`https://api.z.ai/api/paas/v4`) |
| `OLLAMA_HOSTS` | Vercel | Opcional tunnel adresi(leri) — virgülle çoklu |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Vercel | Google OAuth (opsiyonel) |

Örnek dosya: [.env.example](./.env.example) — **gizli anahtarları asla repo'ya koymayın** (`.gitignore` hazır).

## Yerel Motor Kullanımı

1. https://ollama.com indir ve kur (kurulumdan sonra tepsi ikonundan çalışır)
2. Model indir: `ollama run llama3.2`
3. NEXRA → "yerel AI" → **NEXRA Yerel Motor** → model seç → sohbet

**Lokalde CORS ayarı GEREKMEZ:** bağlantı `tarayıcı → aynı-köken Next.js route → Ollama` proxy zinciriyle yapılır. Ollama'nız varsayılan ayarlarıyla çalışır.

## WebLLM Kullanımı

1. Chrome/Edge 113+ (WebGPU gerekli)
2. "yerel AI" → WebLLM → model indir (1–3 GB, bir kez)
3. Tamamen tarayıcıda çalışır — sunucuya hiç veri gitmez

## Teknoloji

Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 + shadcn/ui · Prisma (SQLite, opsiyonel) · ZAI SDK (GLM) · @mlc-ai/web-llm (WebGPU) · Framer Motion · Lucide Icons

## Lisans

MIT
