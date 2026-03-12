import { NextResponse } from "next/server";

import { isTelegramConfigured } from "@/lib/supabase/env";
import { handleTelegramUpdate, verifyTelegramWebhookRequest } from "@/lib/telegram/service";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }

  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

  if (!verifyTelegramWebhookRequest(secretToken)) {
    return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    const result = await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "telegram_webhook_failed",
      },
      { status: 500 },
    );
  }
}
