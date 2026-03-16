import { NextRequest, NextResponse } from "next/server";

import { getServerArchiveRecordsPage } from "@/lib/archive/server-records";
import type { CategoryKey } from "@/lib/archive/types";
import { requireViewerUser } from "@/lib/supabase/access";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

const VALID_CATEGORIES = new Set(["thoughts", "words", "content", "places", "activities"]);

export async function GET(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const viewer = await requireViewerUser("/");
  const { searchParams } = request.nextUrl;

  const limitParam = Number(searchParams.get("limit") ?? "50");
  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const categoryParam = searchParams.get("category");

  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
  const category = categoryParam && VALID_CATEGORIES.has(categoryParam)
    ? (categoryParam as CategoryKey)
    : undefined;

  const result = await getServerArchiveRecordsPage({
    viewerEmail: viewer?.email,
    limit,
    offset,
    category,
  });

  return NextResponse.json({
    ok: true,
    records: result.records,
    totalCount: result.totalCount,
    hasMore: result.hasMore,
  });
}
