import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import type { ArchiveBootstrapState } from "@/lib/archive/context";
import { getServerArchiveRecords } from "@/lib/archive/server-records";
import {
  isAllowedViewerEmail,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  applicationName: "창세록",
  title: {
    default: "창세록",
    template: "%s | 창세록",
  },
  description: "생각, 단어, 콘텐츠, 장소, 활동 기록을 차곡차곡 모아 다시 꺼내보는 개인 아카이브",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico?v=2"],
  },
  appleWebApp: {
    capable: true,
    title: "창세록",
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialArchiveState = await getInitialArchiveState();

  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable} antialiased`}>
        <Providers initialState={initialArchiveState}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

async function getInitialArchiveState(): Promise<ArchiveBootstrapState> {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return {
      records: [],
      isReady: false,
      isRemote: false,
      isAuthenticated: false,
      userEmail: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAllowedViewerEmail(user.email)) {
      return {
        records: [],
        isReady: false,
        isRemote: false,
        isAuthenticated: false,
        userEmail: null,
      };
    }

    const records = await getServerArchiveRecords(user.email);
    return {
      records,
      isReady: true,
      isRemote: true,
      isAuthenticated: true,
      userEmail: user.email ?? null,
    };
  } catch {
    return {
      records: [],
      isReady: false,
      isRemote: false,
      isAuthenticated: false,
      userEmail: null,
    };
  }
}
