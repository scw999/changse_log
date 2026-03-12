import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/admin";
  const nextParam = encodeURIComponent(next);
  const authError = requestUrl.searchParams.get("error");
  const authErrorCode = requestUrl.searchParams.get("error_code");

  if (authError || authErrorCode) {
    return NextResponse.redirect(
      new URL(
        `/login?next=${nextParam}&error=${encodeURIComponent(authErrorCode || authError || "auth_failed")}`,
        requestUrl.origin,
      ),
    );
  }

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL(`/login?next=${nextParam}&error=missing_code`, requestUrl.origin),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?next=${nextParam}&error=${encodeURIComponent(error.code || "otp_expired")}`,
          requestUrl.origin,
        ),
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL(`/login?next=${nextParam}&error=callback_failed`, requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
