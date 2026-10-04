# NEXRA — GitHub → Vercel Dağıtım Rehberi

Bu rehber, projeyi GitHub reposuna atıp Vercel ile site yayına alma adımlarını içerir. Sonunda şuna benzer bir adresin olacak: `https://senin-projen.vercel.app`

## Önemli: Vercel'de Ne Çalışır?

| Özellik | Lokal | Vercel'de |
|---------|-------|-----------|
| Arayüz, sohbet geçmişi (tarayıcıda saklanır) | ✓ | ✓ |
| WebLLM (tarayıcı içi motor) | ✓ | ✓ |
| NEXRA Yerel (Ollama) — sunucu proxy'si | ✓ | ✗ sunucu senin PC'ne ulaşamaz* |
| NEXRA Yerel — tarayıcıdan direkt | ✓ (ayarı gerektirmez) | ✓ `OLLAMA_ORIGINS="*"` ile |
| NEXRA Yerel — tunnel üzerinden proxy | ✓ | ✓ `OLLAMA_HOSTS` ile |
| Bulut AI (GLM) | ✓ | ✓ `ZAI_API_KEY` + `ZAI_BASE_URL` ile |
| Google OAuth | ✓ | ✓ client ID/Secret ile |

*Vercel sunucusu `127.0.0.1` dediğinde KENDİSİNİ görür, senin bilgisayarını değil.

---

## Adım 1 — Projeyi GitHub'a Yükle

Windows'ta proje klasöründe PowerShell aç ve sırayla:

```bash
# (İlk kez kullanıyorsan) git kullanıcı bilgileri
git config --global user.name "Adın"
git config --global user.email "eposta@ornek.com"

git init
git add .
git commit -m "NEXRA v53 — Vercel ready"
```

GitHub'da (https://github.com/new) yeni bir repo aç (adı örn. `nexra`), sonra:

```bash
git remote add origin https://github.com/KULLANICI_ADIN/nexra.git
git branch -M main
git push -u origin main
```

> `.gitignore` hazır: `node_modules/`, `.next/`, `.env`, `.z-ai-config`, `db/*.db` repoya girmez. Gizli anahtar sızma riski yoktur.

## Adım 2 — Vercel'de Proje Oluştur

1. https://vercel.com → GitHub hesabınla giriş yap
2. **Add New → Project** → `nexra` reposunu **Import** et
3. Framework Preset otomatik **Next.js** olarak algılanır — dokunma
4. **Deploy** butonuna bas (env değişkenleri daha sonra da eklenebilir)

İlk deploy ~2-3 dakika sürer. Bitince `https://senin-projen.vercel.app` hazır.

## Adım 3 — Ortam Değişkenleri (Bulut AI için)

Vercel → projen → **Settings → Environment Variables**:

| Name | Value | Not |
|------|-------|-----|
| `ZAI_API_KEY` | z.ai panelinden aldığın anahtar | Bulut AI modu için şart |
| `ZAI_BASE_URL` | `https://api.z.ai/api/paas/v4` | — |
| `GOOGLE_CLIENT_ID` | (opsiyonel) | Google girişi istiyorsan |
| `GOOGLE_CLIENT_SECRET` | (opsiyonel) | — |
| `OLLAMA_HOSTS` | (opsiyonel) → Adım 5 | Tunnel senaryosu |

Kaydettikten sonra **Deployments → son deploy → Redeploy** (env değişkenleri ancak redeploy sonrası aktif olur).

> Bulut AI'yı hiç kullanmayacaksan bu adımı atlayabilirsin — NEXRA Yerel ve WebLLM bunlara ihtiyaç duymaz.

## Adım 4 — Yerel Motoru Vercel'e Bağla

Siten yayındayken PC'ndeki Ollama'yı kullanmak için **iki yoldan birini** seç:

### Yol A — Tarayıcıdan Direkt (en kolay, tek komut)

1. Tepsi ikonundaki Ollama'ya sağ tıkla → **Quit Ollama**
2. PowerShell'de BİR KEZ çalıştır:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
   ```
3. Ollama'yı Başlat menüsünden tekrar aç
4. Siteyi aç → "yerel AI" paneli → **↻ yeniden kontrol et**
   - Panel "NEXRA Yerel çevrimiçi! (tarayıcıdan direkt)" gösterecek

> `OLLAMA_ORIGINS="*"` Ollama'yı her kaynaktan gelen tarayıcı isteğini kabul eder. Ev ağında kişisel kullanım için uygundur; halka açık Wi-Fi'da bilinçli kullan.

### Yol B — Tunnel ile Proxy (CORS'a hiç dokunma)

1. https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ adresinden `cloudflared` indir (veya `winget install Cloudflare.cloudflared`)
2. PC'de çalıştır:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:11434
   ```
   Ekranda `https://xxxx.trycloudflare.com` gibi bir adres verir.
3. Bu adresi Vercel'e ekle: Settings → Environment Variables →
   - Name: `OLLAMA_HOSTS` → Value: `https://xxxx.trycloudflare.com`
4. Redeploy et.
5. Site açılır → "yerel AI" → panel artık "sunucu üzerinden" der — tarayıcıda hiçbir CORS ayarı gerekmez, Ollama'n default ayarında kalır.

> Not: `trycloudflare.com` hızlı-test adresidir; PC kapalıyken/tunnel kapanınca motor çevrimdışı olur. Kalıcı kullanım için Cloudflare'in adlandırılmış tunnel'ını kurabilirsin.

## Adım 5 — Google OAuth (opsiyonel)

1. https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URI:
   ```
   https://senin-projen.vercel.app/api/auth/google/callback
   ```
4. Client ID + Secret'ı Vercel env değişkenlerine ekle → Redeploy

(Kod, `GOOGLE_REDIRECT_URI` tanımlı değilse Vercel URL'sinden callback'i otomatik türetir.)

## Sık Sorulanlar

**Deploy başarılı ama Bulut AI hata veriyor?**
Env değişkenlerini ekledikten sonra Redeploy yaptın mı? `ZAI_API_KEY`/`ZAI_BASE_URL` eksikse Bulut AI çalışmaz; NEXRA Yerel ve WebLLM etkilenmez.

**Panelde "Site yayında (Vercel) — sunucu kendi PC'ndeki Ollama'ya ulaşamaz" yazıyor?**
Beklenen durum. Adım 4'teki Yol A veya B'yi uygula, sonra "↻ yeniden kontrol et".

**Redeploy sonrası tunnel adresi değişti?**
Ücretsiz hızlı tunnel adresleri her açılışta değişir. Yeni adresi `OLLAMA_HOSTS`'a yazıp redeploy et (veya kalıcı tunnel kur).

**Kendi sunucumda (VDS/PC) çalıştırmak istersem?**
```bash
npm install && npm run setup && npm run build && npm run start
```
Bu modda sunucu proxy'si ile aynı makinedeki Ollama'ya CORS'suz bağlanır — Vercel'e gerek kalmaz.
