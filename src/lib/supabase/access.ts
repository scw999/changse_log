import { redirect } from "next/navigation";

import {
  isAdminEmailConfigured,
  isAllowedAdminEmail,
  isAllowedViewerEmail,
  isSupabaseConfigured,
  isViewerEmailConfigured,
} from "@/lib/supabase/env";
import { getServerUser } from "@/lib/supabase/server";

export async function requireViewerUser(nextPath = "/") {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const user = await getServerUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isViewerEmailConfigured() || !isAllowedViewerEmail(user.email)) {
    redirect("/access-denied");
  }

  return user;
}

export async function getAuthenticatedAdminUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const user = await getServerUser();

  if (!user) {
    return null;
  }

  if (!isAdminEmailConfigured() || !isAllowedAdminEmail(user.email)) {
    return null;
  }

  return user;
}

export async function requireAdminUser(nextPath = "/admin") {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const user = await getServerUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isViewerEmailConfigured() || !isAllowedViewerEmail(user.email)) {
    redirect("/access-denied");
  }

  if (!isAdminEmailConfigured() || !isAllowedAdminEmail(user.email)) {
    redirect("/access-denied");
  }

  return user;
}
