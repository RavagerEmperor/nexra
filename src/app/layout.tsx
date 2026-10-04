import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXRA — Operator'a Bagli",
  description: "NEXRA. Operator'in sesi. Sinyal bekliyor.",
  keywords: ["NEXRA", "AI", "chat", "operator"],
  authors: [{ name: "NEXRA" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "NEXRA",
    description: "Operator'a bagli. Sinyal bekliyor.",
    url: "https://chat.z.ai",
    siteName: "NEXRA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXRA",
    description: "Operator'a bagli. Sinyal bekliyor.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
