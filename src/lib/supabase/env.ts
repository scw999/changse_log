export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const allowedAdminEmail = process.env.ALLOWED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
export const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
export const telegramWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
export const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ?? "";
export const internalIngestSecret = process.env.INTERNAL_INGEST_SECRET;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function isAdminEmailConfigured() {
  return Boolean(allowedAdminEmail);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email || !allowedAdminEmail) {
    return false;
  }

  return email.trim().toLowerCase() === allowedAdminEmail;
}

export function isTelegramConfigured() {
  return Boolean(telegramBotToken && telegramWebhookSecret && supabaseUrl && supabaseServiceRoleKey);
}

export function isInternalIngestConfigured() {
  return Boolean(internalIngestSecret && supabaseUrl && supabaseServiceRoleKey && allowedAdminEmail);
}
