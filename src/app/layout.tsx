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
  title: {
    default: "李쎌꽭濡?",
    template: "%s | 李쎌꽭濡?",
  },
  description: "?띠쓽 湲곕줉??援ъ“?뷀빐 ??ν븯怨??ㅼ떆 ?쎈뒗 private personal archive",
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
