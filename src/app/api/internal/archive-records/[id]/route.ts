import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalIngestConfigured } from "@/lib/supabase/env";
import { getOwnedArchiveRecord, isAuthorizedInternalRequest, serializeInternalError } from "@/lib/internal-auth";
import { parseInternalRecordPatch, serializeArchiveRecord } from "@/lib/internal-record-update";

const ARCHIVE_RECORDS_TABLE = "archive_records";

export async function PATCH(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const patch = parseInternalRecordPatch(body);
    const { ownerId, record } = await getOwnedArchiveRecord(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from(ARCHIVE_RECORDS_TABLE)
      .update(serializeArchiveRecord(ownerId, record, patch))
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id, title, source_type, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      record: data,
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal archive update failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_record_update_failed",
        details,
      },
      { status: 400 },
    );
  }
}
