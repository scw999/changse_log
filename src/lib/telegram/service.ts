import { randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { telegramWebhookSecret } from "@/lib/supabase/env";
import { answerTelegramCallbackQuery, buildTelegramVerificationLink, sendTelegramMessage } from "@/lib/telegram/bot";
import { buildArchiveDetails, buildStructuredDraft } from "@/lib/telegram/draft-generator";
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from "@/lib/telegram/types";

const TELEGRAM_IDENTITIES_TABLE = "telegram_identities";
const INBOX_MESSAGES_TABLE = "inbox_messages";
const DRAFT_RECORDS_TABLE = "draft_records";
const DRAFT_EVENTS_TABLE = "draft_events";
const ARCHIVE_RECORDS_TABLE = "archive_records";

export async function createTelegramVerificationChallenge(ownerId: string) {
  const admin = createSupabaseAdminClient();
  const token = randomBytes(4).toString("hex");

  const { data, error } = await admin
    .from(TELEGRAM_IDENTITIES_TABLE)
    .upsert(
      {
        owner_id: ownerId,
        status: "pending",
        verification_token: token,
      },
      { onConflict: "owner_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    token,
    deepLink: buildTelegramVerificationLink(token),
    identity: data,
  };
}

export function verifyTelegramWebhookRequest(secretToken: string | null) {
  return Boolean(secretToken && telegramWebhookSecret && secretToken === telegramWebhookSecret);
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }

  const message = update.message ?? update.edited_message;

  if (!message?.from) {
    return { ok: true, ignored: "missing_sender" as const };
  }

  const text = message.text?.trim() ?? message.caption?.trim() ?? "";

  if (!text) {
    await sendTelegramMessage(message.chat.id, "텍스트 메시지 위주로 먼저 받아둘게요. 메모를 한 줄로 보내주시면 초안을 만들겠습니다.");
    return { ok: true, ignored: "unsupported_message" as const };
  }

  if (text.startsWith("/start")) {
    return handleStartCommand(message, text);
  }

  const identity = await findVerifiedIdentity(message.from.id);

  if (!identity) {
    await sendTelegramMessage(
      message.chat.id,
      "연결되지 않은 Telegram 계정입니다. 창세록 관리자 화면에서 연결 링크를 만든 뒤 그 링크로 다시 시작해 주세요.",
    );
    return { ok: true, ignored: "unauthorized_sender" as const };
  }

  return handleInboxCapture(update.update_id, message, identity);
}

async function handleStartCommand(message: TelegramMessage, text: string) {
  const token = parseVerificationToken(text);

  if (!token || !message.from) {
    await sendTelegramMessage(message.chat.id, "유효한 연결 코드가 보이지 않습니다. 관리자 화면에서 새 연결 링크를 만들어 다시 시도해 주세요.");
    return { ok: true, ignored: "invalid_start" as const };
  }

  const admin = createSupabaseAdminClient();
  const { data: identity, error } = await admin
    .from(TELEGRAM_IDENTITIES_TABLE)
    .select("*")
    .eq("verification_token", token)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!identity) {
    await sendTelegramMessage(message.chat.id, "연결 코드가 만료되었거나 찾을 수 없습니다. 관리자 화면에서 새 링크를 만들어 주세요.");
    return { ok: true, ignored: "token_not_found" as const };
  }

  const { error: updateError } = await admin
    .from(TELEGRAM_IDENTITIES_TABLE)
    .update({
      telegram_user_id: message.from.id,
      telegram_chat_id: message.chat.id,
      telegram_username: message.from.username ?? null,
      telegram_first_name: message.from.first_name ?? null,
      telegram_last_name: message.from.last_name ?? null,
      status: "verified",
      verified_at: new Date().toISOString(),
      verification_token: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", identity.id);

  if (updateError) {
    throw updateError;
  }

  await sendTelegramMessage(
    message.chat.id,
    "창세록 Telegram 연결이 완료되었습니다. 이제 메모를 보내주시면 초안을 만들고 승인 버튼을 보내드릴게요.",
  );

  return { ok: true, verified: true as const };
}

async function handleInboxCapture(updateId: number, message: TelegramMessage, identity: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const ownerId = String(identity.owner_id);
  const rawText = message.text?.trim() ?? message.caption?.trim() ?? "";

  const { data: inbox, error: inboxError } = await admin
    .from(INBOX_MESSAGES_TABLE)
    .insert({
      owner_id: ownerId,
      telegram_identity_id: identity.id,
      telegram_update_id: updateId,
      telegram_message_id: message.message_id,
      telegram_chat_id: message.chat.id,
      raw_text: rawText,
      message_type: message.text ? "text" : "caption",
      status: "received",
      received_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (inboxError) {
    if (String(inboxError.code) === "23505") {
      return { ok: true, duplicated: true as const };
    }

    throw inboxError;
  }

  const draftSeed = buildStructuredDraft(rawText);

  const { data: draft, error: draftError } = await admin
    .from(DRAFT_RECORDS_TABLE)
    .insert({
      owner_id: ownerId,
      inbox_message_id: inbox.id,
      category: draftSeed.category,
      subcategory: draftSeed.subcategory,
      title: draftSeed.title,
      body: draftSeed.body,
      summary: draftSeed.summary,
      tags: draftSeed.tags,
      source_type: "telegram",
      status: "pending_approval",
      structured_payload: draftSeed.details,
      assistant_note: "Telegram rough note를 기준으로 자동 초안을 생성했습니다.",
    })
    .select("*")
    .single();

  if (draftError) {
    await admin
      .from(INBOX_MESSAGES_TABLE)
      .update({
        status: "failed",
        error_message: draftError.message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", inbox.id);
    throw draftError;
  }

  await logDraftEvent(draft.id, "system", "draft_created", {
    inboxMessageId: inbox.id,
    category: draft.category,
  });

  await admin
    .from(INBOX_MESSAGES_TABLE)
    .update({
      status: "awaiting_approval",
      processed_at: new Date().toISOString(),
    })
    .eq("id", inbox.id);

  await sendTelegramMessage(message.chat.id, renderDraftMessage(draft), {
    inline_keyboard: [
      [
        { text: "승인", callback_data: `draft:${draft.id}:approve` },
        { text: "수정 요청", callback_data: `draft:${draft.id}:revise` },
        { text: "취소", callback_data: `draft:${draft.id}:reject` },
      ],
    ],
  });

  return { ok: true, drafted: true as const, draftId: draft.id };
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const data = callbackQuery.data ?? "";
  const parsed = parseCallbackData(data);

  if (!parsed) {
    await answerTelegramCallbackQuery(callbackQuery.id, "알 수 없는 동작입니다.");
    return { ok: true, ignored: "unknown_callback" as const };
  }

  const identity = await findVerifiedIdentity(callbackQuery.from.id);

  if (!identity) {
    await answerTelegramCallbackQuery(callbackQuery.id, "허용되지 않은 계정입니다.");
    return { ok: true, ignored: "unauthorized_callback" as const };
  }

  const admin = createSupabaseAdminClient();
  const { data: draft, error } = await admin
    .from(DRAFT_RECORDS_TABLE)
    .select("*")
    .eq("id", parsed.draftId)
    .eq("owner_id", identity.owner_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!draft) {
    await answerTelegramCallbackQuery(callbackQuery.id, "해당 초안을 찾지 못했습니다.");
    return { ok: true, ignored: "draft_missing" as const };
  }

  if (parsed.action === "approve") {
    const archiveRecordId = await saveDraftToArchive(draft, identity);

    await admin
      .from(DRAFT_RECORDS_TABLE)
      .update({
        status: "approved",
        archive_record_id: archiveRecordId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", draft.id);

    if (draft.inbox_message_id) {
      await admin
        .from(INBOX_MESSAGES_TABLE)
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
        })
        .eq("id", draft.inbox_message_id);
    }

    await logDraftEvent(draft.id, "owner", "approved", { archiveRecordId });
    await answerTelegramCallbackQuery(callbackQuery.id, "창세록에 저장했습니다.");

    if (callbackQuery.message?.chat.id) {
      await sendTelegramMessage(
        callbackQuery.message.chat.id,
        "저장 완료. 자세한 수정은 창세록 웹앱 관리자 화면에서 이어서 할 수 있습니다.",
      );
    }

    return { ok: true, approved: true as const };
  }

  if (parsed.action === "reject") {
    await admin
      .from(DRAFT_RECORDS_TABLE)
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
      })
      .eq("id", draft.id);

    if (draft.inbox_message_id) {
      await admin
        .from(INBOX_MESSAGES_TABLE)
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
        })
        .eq("id", draft.inbox_message_id);
    }

    await logDraftEvent(draft.id, "owner", "rejected", {});
    await answerTelegramCallbackQuery(callbackQuery.id, "초안을 취소했습니다.");

    if (callbackQuery.message?.chat.id) {
      await sendTelegramMessage(callbackQuery.message.chat.id, "초안을 취소했습니다. 원하면 새 메모를 다시 보내 주세요.");
    }

    return { ok: true, rejected: true as const };
  }

  await admin
    .from(DRAFT_RECORDS_TABLE)
    .update({
      status: "revision_requested",
      revision_note: "Telegram에서 수정 요청 버튼을 눌렀습니다.",
    })
    .eq("id", draft.id);

  await logDraftEvent(draft.id, "owner", "revision_requested", {});
  await answerTelegramCallbackQuery(callbackQuery.id, "수정 요청을 남겼습니다.");

  if (callbackQuery.message?.chat.id) {
    await sendTelegramMessage(
      callbackQuery.message.chat.id,
      "이 MVP에서는 Telegram 안에서 길게 수정하지 않고, 보정 내용을 새 메시지로 다시 보내 새 초안을 만들도록 안내합니다.",
    );
  }

  return { ok: true, revised: true as const };
}

async function saveDraftToArchive(draft: Record<string, unknown>, identity: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const detailPayload = (draft.structured_payload ?? {}) as Record<string, unknown>;

  const row = {
    owner_id: identity.owner_id,
    title: draft.title,
    body: draft.body,
    category: draft.category,
    subcategory: draft.subcategory,
    tags: draft.tags ?? [],
    event_date: draft.event_date ?? null,
    importance: draft.importance ?? 3,
    source_type: "telegram",
    summary: draft.summary ?? "",
    notes: draft.assistant_note ?? null,
    details: {
      ...buildArchiveDetails(draft.category as never, detailPayload),
      ingestion: {
        draft_record_id: draft.id,
        inbox_message_id: draft.inbox_message_id,
        telegram_user_id: identity.telegram_user_id,
      },
    },
  };

  const { data, error } = await admin.from(ARCHIVE_RECORDS_TABLE).insert(row).select("id").single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function findVerifiedIdentity(telegramUserId: number) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(TELEGRAM_IDENTITIES_TABLE)
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .eq("status", "verified")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    await admin
      .from(TELEGRAM_IDENTITIES_TABLE)
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

async function logDraftEvent(
  draftId: string,
  actorType: "system" | "owner",
  eventType: string,
  payload: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  await admin.from(DRAFT_EVENTS_TABLE).insert({
    draft_record_id: draftId,
    actor_type: actorType,
    event_type: eventType,
    payload,
  });
}

function parseVerificationToken(text: string) {
  const match = text.match(/\/start(?:@\w+)?\s+link_([a-z0-9]+)/i);
  return match?.[1] ?? null;
}

function parseCallbackData(value: string) {
  const match = value.match(/^draft:([a-f0-9-]+):(approve|reject|revise)$/i);

  if (!match) {
    return null;
  }

  return {
    draftId: match[1],
    action: match[2] as "approve" | "reject" | "revise",
  };
}

function renderDraftMessage(draft: Record<string, unknown>) {
  return [
    "창세봇이 초안을 정리했어요.",
    `카테고리: ${draft.category}`,
    `세부 유형: ${draft.subcategory}`,
    `제목: ${draft.title}`,
    `요약: ${draft.summary}`,
    "",
    "저장할까요?",
  ].join("\n");
}
