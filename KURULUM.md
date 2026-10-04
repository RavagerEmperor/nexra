# NEXRA — Kurulum Rehberi

Bu rehber, projeyi GitHub'dan indirip kendi bilgisayarında (VS Code dahil) çalıştırmak isteyenler içindir. Yerel motor (NEXRA Yerel) kurulu Ollama'nı bağlanır; **hiçbir ek ayar (CORS vb.) gerekmez** — bağlantı uygulamanın kendi sunucu proxy'si üzerinden yapılır.

## Gereksinimler

| Araç | Sürüm | Not |
|------|-------|-----|
| Node.js | 20+ | https://nodejs.org (LTS) |
| Ollama | güncel | https://ollama.com — kurulumdan sonra tepsi ikonundan çalışır |
| En az 1 model | — | `ollama run llama3.2` ile indir (kuruluysa gerek yok) |

## Kurulum (4 adım)

```bash
# 0) Ortam dosyasını hazırla (bir kez)
#    Windows (PowerShell): copy .env.example .env
cp .env.example .env

# 1) Bağımlılıklar (Prisma client otomatik üretilir)
npm install

# 2) Veritabanını hazırla (bir kez)
npm run setup

# 3) Geliştirme sunucusunu başlat
npm run dev
```

Ardından tarayıcıda **http://localhost:3000** adresini aç.

## Ollama'yı (NEXRA Yerel Motor) bağlama

1. Sağ üstteki **"yerel AI"** düğmesine tıkla
2. **"NEXRA Yerel Motor"** kartını seç — "NEXRA Yerel çevrimiçi!" yazmalı
3. Kurulu modellerden birini seç, paneli kapat, sohbete başla

Sohbette model her zaman **NEXRA** kimliğiyle konuşur (Llama/Qwen vb. kendini tanıtmaz).

### Yaygın sorunlar

| Sorun | Çözüm |
|-------|-------|
| "NEXRA Yerel bulunamadı" | Tepsi ikonunda Ollama çalışıyor mu? Başlat menüsünden Ollama'yı aç |
| Model listede yok / 404 | Terminal: `ollama pull llama3.2` |
| Port 3000 dolu | `npm run dev -- -p 3001` |
| Bulut (ZAI) modu hata veriyor | Bulut modu SDK kimlik bilgisi ister; NEXRA Yerel modu bundan bağımsızdır ve tamamen offline çalışır |

## Üretime alma (opsiyonel)

```bash
npm run build
npm run start
```

## GitHub'a yükleme

`.gitignore` hazır: `node_modules/`, `.next/`, loglar, `.env`, `.z-ai-config` ve `db/*.db` dosyaları repoya girmez (veritabanı şeması `prisma/schema.prisma` içinde taşınır; `.db` dosyası her kurulumda `npm run setup` ile oluşur). Gizli anahtarlar repoya sızmaz.

```bash
git init
git add .
git commit -m "NEXRA"
git remote add origin <repo-url>
git push -u origin main
```

Siteyi Vercel ile yayına almak için **[DEPLOY.md](./DEPLOY.md)** rehberine bak.
