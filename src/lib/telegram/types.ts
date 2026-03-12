export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  from?: TelegramUser;
  chat: TelegramChat;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramBotResponse<T> {
  ok: boolean;
  result: T;
}

export interface TelegramDashboardIdentity {
  id: string;
  status: string;
  telegramUserId: number | null;
  telegramChatId: number | null;
  telegramUsername?: string | null;
  verificationToken?: string | null;
  verifiedAt?: string | null;
  lastSeenAt?: string | null;
}

export interface TelegramInboxItem {
  id: string;
  rawText: string;
  status: string;
  receivedAt: string;
  processedAt?: string | null;
}

export interface TelegramDraftItem {
  id: string;
  title: string;
  category: string;
  status: string;
  summary: string;
  createdAt: string;
}
