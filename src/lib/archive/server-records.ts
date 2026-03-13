import { hydrateImageUrls, ImageRow, RecordRow, rowToRecord } from "@/lib/archive/supabase-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireViewerUser } from "@/lib/supabase/access";
import { isAllowedAdminEmail } from "@/lib/supabase/env";
import { resolveAllowedOwnerId } from "@/lib/internal-auth";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";

export async function getServerArchiveRecordDetail(recordId: string) {
  const viewer = await requireViewerUser(`/records/${recordId}`);
  const admin = createSupabaseAdminClient();
  const ownerId = await resolveAllowedOwnerId();
  const canViewPrivate = isAllowedAdminEmail(viewer?.email);

  let recordQuery = admin
    .from(RECORDS_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", recordId);

  if (!canViewPrivate) {
    recordQuery = recordQuery.eq("visibility", "shared");
  }

  const { data: recordRow, error: recordError } = await recordQuery.maybeSingle();

  if (recordError) {
    throw new Error(recordError.message);
  }

  if (!recordRow) {
    return null;
  }

  const { data: imageRows, error: imageError } = await admin
    .from(IMAGES_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("record_id", recordId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    throw new Error(imageError.message);
  }

  const hydratedImages = await hydrateImageUrls(admin, (imageRows ?? []) as ImageRow[]);
  const images = hydratedImages.map((entry) => entry.image);

  return rowToRecord(recordRow as RecordRow, images);
}
