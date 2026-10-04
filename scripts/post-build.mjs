// Cross-platform post-build: standalone çıktıya statik + public kopyalar
// (Windows PowerShell uyumlu — cp -r kullanmaz)
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const staticDst = join(standalone, ".next", "static");
const publicSrc = join(root, "public");
const publicDst = join(standalone, "public");

if (!existsSync(standalone)) {
  // Vercel'de standalone çıktı üretilmez (next.config koşullu) — bu bir HATA değil.
  console.warn("! standalone çıktısı yok (Vercel'de normaldir) — post-build atlandı");
  process.exit(0);
}

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDst, { recursive: true });
  console.log("✓ .next/static → standalone/.next/static kopyalandı");
} else {
  console.warn("! .next/static yok, atlandı");
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDst, { recursive: true });
  console.log("✓ public → standalone/public kopyalandı");
} else {
  console.warn("! public yok, atlandı");
}
