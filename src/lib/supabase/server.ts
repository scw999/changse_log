import { cache } from "react";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignore when called from a Server Component render.
        }
      },
    },
  });
}

/**
 * Deduplicated per-request auth check.
 * Layout and page both call this, but Supabase is hit only once per render.
 */
export const getServerUser = cache(async (): Promise<User | null> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
});
