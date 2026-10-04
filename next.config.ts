import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" çıktı yalnızca kendi sunucunda/VDS'te çalıştırmak için.
  // Vercel kendi build hattını kullandığından orada standalone gereksizdir
  // ve Vercel dokümanları bunu önermez — bu yüzden koşullu.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    // TS hataları düzeltildi — artık build sırasında tip doğrulaması aktif
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
