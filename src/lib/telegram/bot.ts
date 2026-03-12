import { telegramBotToken, telegramBotUsername } from "@/lib/supabase/env";
import type { TelegramBotResponse } from "@/lib/telegram/types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text: string) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export function buildTelegramVerificationLink(token: string) {
  if (!telegramBotUsername) {
    return "";
  }

  return `https://t.me/${telegramBotUsername}?start=link_${token}`;
}

async function callTelegramApi<T>(method: string, payload: Record<string, unknown>) {
  if (!telegramBotToken) {
    throw new Error("Telegram bot token is missing");
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${telegramBotToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram API request failed with ${response.status}`);
  }

  const data = (await response.json()) as TelegramBotResponse<T>;

  if (!data.ok) {
    throw new Error("Telegram API returned an error");
  }

  return data.result;
}
