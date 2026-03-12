export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const allowedAdminEmail = process.env.ALLOWED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
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
