"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
