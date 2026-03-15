import type { ArchiveImage, ArchiveRecord } from "@/lib/archive/types";
import { hydrateImageUrls, ImageRow, RecordRow, rowToRecord } from "@/lib/archive/supabase-store";
import { resolveAllowedOwnerId } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireViewerUser } from "@/lib/supabase/access";
import { isAllowedAdminEmail } from "@/lib/supabase/env";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";
const IMAGE_URL_TTL = 60 * 60;

export async function getServerArchiveRecords(viewerEmail?: string | null) {
  const admin = createSupabaseAdminClient();
  const ownerId = await resolveAllowedOwnerId();
  const canViewPrivate = isAllowedAdminEmail(viewerEmail);

  let recordsQuery = admin
    .from(RECORDS_TABLE)
    .select(
      "id, owner_id, title, body, category, subcategory, tags, created_at, updated_at, event_date, importance, source_type, summary, notes, visibility, details",
    )
    .eq("owner_id", ownerId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (!canViewPrivate) {
    recordsQuery = recordsQuery.eq("visibility", "shared");
  }

  const { data: recordRows, error: recordError } = await recordsQuery;
  if (recordError) {
    throw recordError;
  }

  const rows = (recordRows ?? []) as RecordRow[];
  if (rows.length === 0) {
    return [] as ArchiveRecord[];
  }

  const recordIds = rows.map((row) => row.id);
  const { data: imageRows, error: imageError } = await admin
    .from(IMAGES_TABLE)
    .select("id, record_id, storage_path, caption, alt_text, is_primary, sort_order, created_at")
    .eq("owner_id", ownerId)
    .in("record_id", recordIds)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    throw imageError;
  }

  const representativeRows = selectRepresentativeRows((imageRows ?? []) as ImageRow[]);
  const signedImageMap = await createThumbnailMap(admin, representativeRows);

  return rows.map((row) => buildListRecord(row, signedImageMap.get(row.id) ?? null));
}

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

function buildListRecord(row: RecordRow, thumbnail: ArchiveImage | null): ArchiveRecord {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const content = asObject(details.content);
  const place = asObject(details.place);
  const activity = asObject(details.activity);
  const thought = asObject(details.thought);
  const word = asObject(details.word);

  const rating =
    readNumber(content?.rating) ??
    readNumber(place?.rating) ??
    readNumber(activity?.satisfactionRating);
  const locationLabel = readString(place?.placeName) ?? readString(activity?.location) ?? "";
  const areaLabel = readString(place?.area) ?? readString(activity?.location) ?? "";
  const revisitCandidate =
    readString(content?.revisitIntent) === "yes" ||
    readString(place?.revisitIntent) === "yes" ||
    thought?.worthRevisiting === true;
  const headline =
    readString(thought?.oneLineThought) ??
    (readString(word?.term) && readString(word?.meaning)
      ? `${readString(word?.term)} · ${readString(word?.meaning)}`
      : null) ??
    readString(content?.oneLineReview) ??
    readString(place?.oneLineReview) ??
    readString(activity?.summary) ??
    "";

  return {
    id: row.id,
    title: row.title,
    body: "",
    category: row.category,
    subcategory: row.subcategory,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    eventDate: row.event_date ?? undefined,
    importance: row.importance,
    sourceType: row.source_type,
    summary: row.summary ?? "",
    notes: undefined,
    visibility: row.visibility ?? "private",
    searchText: buildSearchText(row, content, place, activity, thought, word),
    rating: rating ?? null,
    headline,
    locationLabel,
    areaLabel,
    revisitCandidate,
    thumbnail,
    images: [],
  };
}

function buildSearchText(
  row: RecordRow,
  content?: Record<string, unknown>,
  place?: Record<string, unknown>,
  activity?: Record<string, unknown>,
  thought?: Record<string, unknown>,
  word?: Record<string, unknown>,
) {
  return [
    row.title,
    row.summary ?? "",
    row.body,
    ...(row.tags ?? []),
    readString(word?.term),
    readString(word?.meaning),
    readString(word?.example),
    readString(content?.titleOriginal) ?? readString(content?.originalTitle),
    readString(content?.oneLineReview),
    ...(Array.isArray(content?.memorablePoints) ? content.memorablePoints : []),
    readString(place?.placeName),
    readString(place?.area),
    readString(place?.oneLineReview),
    readString(activity?.location),
    readString(activity?.summary),
    readString(thought?.oneLineThought),
    readString(thought?.expandedNote),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

function selectRepresentativeRows(rows: ImageRow[]) {
  const representativeRows = new Map<string, ImageRow>();

  for (const row of rows) {
    if (!representativeRows.has(row.record_id)) {
      representativeRows.set(row.record_id, row);
    }
  }

  return [...representativeRows.values()];
}

async function createThumbnailMap(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: ImageRow[],
) {
  if (rows.length === 0) {
    return new Map<string, ArchiveImage>();
  }

  const { data, error } = await admin.storage
    .from("record-images")
    .createSignedUrls(rows.map((row) => row.storage_path), IMAGE_URL_TTL);

  if (error) {
    throw error;
  }

  const imageMap = new Map<string, ArchiveImage>();
  rows.forEach((row, index) => {
    imageMap.set(row.record_id, {
      id: row.id,
      storagePath: row.storage_path,
      url: data?.[index]?.signedUrl ?? "",
      caption: row.caption ?? undefined,
      altText: row.alt_text ?? undefined,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    });
  });

  return imageMap;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}
