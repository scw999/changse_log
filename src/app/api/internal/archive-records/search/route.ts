import { NextResponse } from "next/server";

import {
  isAuthorizedInternalRequest,
  listOwnedArchiveRecords,
  serializeInternalError,
} from "@/lib/internal-auth";
import {
  parseInternalSearchPayload,
  rankArchiveSearchResults,
  toCompactInternalRecord,
} from "@/lib/internal-record-search";
import { isInternalIngestConfigured } from "@/lib/supabase/env";

const FETCH_LIMIT = 250;

export async function POST(request: Request) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = parseInternalSearchPayload(body);
    const { records } = await listOwnedArchiveRecords({
      category: payload.category,
      limit: FETCH_LIMIT,
    });

    const results = rankArchiveSearchResults(records, payload.query)
      .slice(0, payload.limit)
      .map(toCompactInternalRecord);

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal archive search failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_archive_search_failed",
        details,
      },
      { status: 400 },
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
