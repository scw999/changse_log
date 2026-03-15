import { NextResponse } from "next/server";

import { getServerArchiveRecords } from "@/lib/archive/server-records";
import { requireViewerUser } from "@/lib/supabase/access";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const viewer = await requireViewerUser("/");
  const records = await getServerArchiveRecords(viewer?.email);
  return NextResponse.json({ ok: true, records });
}
