import { redirect } from "next/navigation";

import { isAdminEmailConfigured, isAllowedAdminEmail, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdminUser(nextPath = "/admin") {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdminEmailConfigured() || !isAllowedAdminEmail(user.email)) {
    redirect("/access-denied");
  }

  return user;
}
