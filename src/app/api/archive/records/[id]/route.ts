import { NextResponse } from "next/server";

import { getServerArchiveRecordDetail } from "@/lib/archive/server-records";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const { id } = await context.params;

  try {
    const record = await getServerArchiveRecordDetail(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "record_detail_fetch_failed" },
      { status: 400 },
    );
  }
}
