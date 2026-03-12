import { NextResponse } from "next/server";

import { getAuthenticatedAdminUser } from "@/lib/supabase/access";
import { isTelegramConfigured } from "@/lib/supabase/env";
import { createTelegramVerificationChallenge } from "@/lib/telegram/service";

export async function POST() {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }

  try {
    const user = await getAuthenticatedAdminUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await createTelegramVerificationChallenge(user.id);
    return NextResponse.json({
      ok: true,
      token: result.token,
      deepLink: result.deepLink,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "verification_challenge_failed",
      },
      { status: 500 },
    );
  }
}
