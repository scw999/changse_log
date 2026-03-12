import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";

import Providers from "./providers";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-korean-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-korean-serif",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "창세록",
    template: "%s | 창세록",
  },
  description: "삶의 기록을 구조화해 저장하고 다시 발견하는 개인 아카이브 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
