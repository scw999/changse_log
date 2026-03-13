import { NextResponse } from "next/server";

import {
  isAuthorizedInternalRequest,
  listOwnedArchiveRecords,
  serializeInternalError,
} from "@/lib/internal-auth";
import { parseRecentLimit, toCompactInternalRecord } from "@/lib/internal-record-search";
import { isInternalIngestConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = parseRecentLimit(url.searchParams.get("limit"));
    const { records } = await listOwnedArchiveRecords({ limit });

    return NextResponse.json({
      ok: true,
      results: records.map(toCompactInternalRecord),
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal archive recent failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_archive_recent_failed",
        details,
      },
      { status: 400 },
    );
  }
}
