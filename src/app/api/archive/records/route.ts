import { NextResponse } from "next/server";

import { hydrateImageUrls, ImageRow, RecordRow, rowToRecord } from "@/lib/archive/supabase-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAllowedAdminEmail, isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { requireViewerUser } from "@/lib/supabase/access";
import { resolveAllowedOwnerId } from "@/lib/internal-auth";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";

export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const viewer = await requireViewerUser("/");
  const ownerId = await resolveAllowedOwnerId();
  const admin = createSupabaseAdminClient();
  const canViewPrivate = isAllowedAdminEmail(viewer?.email);

  let recordsQuery = admin
    .from(RECORDS_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!canViewPrivate) {
    recordsQuery = recordsQuery.eq("visibility", "shared");
  }

  const { data: recordRows, error: recordError } = await recordsQuery;

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 400 });
  }

  const rows = (recordRows ?? []) as RecordRow[];

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, records: [] });
  }

  const recordIds = rows.map((row) => row.id);
  const { data: imageRows, error: imageError } = await admin
    .from(IMAGES_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .in("record_id", recordIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    return NextResponse.json({ error: imageError.message }, { status: 400 });
  }

  const hydratedImages = await hydrateImageUrls(admin, (imageRows ?? []) as ImageRow[]);
  const imagesByRecord = new Map<string, ReturnType<typeof rowToRecord>["images"]>();

  for (const image of hydratedImages) {
    const list = imagesByRecord.get(image.recordId) ?? [];
    list.push(image.image);
    imagesByRecord.set(image.recordId, list);
  }

  const records = rows.map((row) => rowToRecord(row, imagesByRecord.get(row.id) ?? []));

  return NextResponse.json({
    ok: true,
    records: records.map((record) => {
      if (canViewPrivate) {
        return record;
      }

      const { visibility, ...publicRecord } = record;
      void visibility;
      return publicRecord;
    }),
  });
}
