import { NextResponse } from "next/server";

import { hydrateImageUrls, ImageRow, RecordRow, rowToRecord } from "@/lib/archive/supabase-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAllowedAdminEmail, isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { requireViewerUser } from "@/lib/supabase/access";
import { resolveAllowedOwnerId } from "@/lib/internal-auth";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const viewer = await requireViewerUser("/");
  const { id } = await context.params;
  const ownerId = await resolveAllowedOwnerId();
  const admin = createSupabaseAdminClient();
  const canViewPrivate = isAllowedAdminEmail(viewer?.email);

  let recordQuery = admin
    .from(RECORDS_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (!canViewPrivate) {
    recordQuery = recordQuery.eq("visibility", "shared");
  }

  const { data: recordRow, error: recordError } = await recordQuery.maybeSingle();

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 400 });
  }

  if (!recordRow) {
    return NextResponse.json({ error: "record_not_found" }, { status: 404 });
  }

  const { data: imageRows, error: imageError } = await admin
    .from(IMAGES_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("record_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    return NextResponse.json({ error: imageError.message }, { status: 400 });
  }

  const hydratedImages = await hydrateImageUrls(admin, (imageRows ?? []) as ImageRow[]);
  const images = hydratedImages.map((entry) => entry.image);

  return NextResponse.json({
    ok: true,
    record: rowToRecord(recordRow as RecordRow, images),
  });
}
