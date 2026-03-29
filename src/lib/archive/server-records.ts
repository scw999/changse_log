import type { ArchiveImage, ArchiveRecord, CategoryKey } from "@/lib/archive/types";
import { getCachedSignedUrl, setCachedSignedUrl } from "@/lib/archive/signed-url-cache";
import { hydrateImageUrls, ImageRow, RecordRow, rowToRecord } from "@/lib/archive/supabase-store";
import { resolveAllowedOwnerId } from "@/lib/internal-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireViewerUser } from "@/lib/supabase/access";
import { isAllowedAdminEmail } from "@/lib/supabase/env";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";
const IMAGE_URL_TTL = 60 * 60 * 24;
const DEFAULT_PAGE_LIMIT = 50;

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

export interface PagedRecordsResult {
  records: ArchiveRecord[];
  totalCount: number;
  hasMore: boolean;
}

export async function getServerArchiveRecordsPage(options: {
  viewerEmail?: string | null;
  category?: CategoryKey;
  limit?: number;
  offset?: number;
}): Promise<PagedRecordsResult> {
  const admin = createSupabaseAdminClient();
  const ownerId = await resolveAllowedOwnerId();
  const canViewPrivate = isAllowedAdminEmail(options.viewerEmail);
  const limit = options.limit ?? DEFAULT_PAGE_LIMIT;
  const offset = options.offset ?? 0;

  let countQuery = admin
    .from(RECORDS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if (!canViewPrivate) {
    countQuery = countQuery.eq("visibility", "shared");
  }
  if (options.category) {
    countQuery = countQuery.eq("category", options.category);
  }

  let recordsQuery = admin
    .from(RECORDS_TABLE)
    .select(
      "id, owner_id, title, body, category, subcategory, tags, created_at, updated_at, event_date, importance, source_type, summary, notes, visibility, details",
    )
    .eq("owner_id", ownerId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!canViewPrivate) {
    recordsQuery = recordsQuery.eq("visibility", "shared");
  }
  if (options.category) {
    recordsQuery = recordsQuery.eq("category", options.category);
  }

  const [countResult, recordsResult] = await Promise.all([countQuery, recordsQuery]);

  if (countResult.error) throw countResult.error;
  if (recordsResult.error) throw recordsResult.error;

  const totalCount = countResult.count ?? 0;
  const rows = (recordsResult.data ?? []) as RecordRow[];

  if (rows.length === 0) {
    return { records: [], totalCount, hasMore: false };
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

  if (imageError) throw imageError;

  const representativeRows = selectRepresentativeRows((imageRows ?? []) as ImageRow[]);
  const signedImageMap = await createThumbnailMap(admin, representativeRows);

  const records = rows.map((row) => buildListRecord(row, signedImageMap.get(row.id) ?? null));
  return { records, totalCount, hasMore: offset + limit < totalCount };
}

export interface DashboardData {
  recentRecords: ArchiveRecord[];
  recentThoughts: ArchiveRecord[];
  recentPlaces: ArchiveRecord[];
  recentActivities: ArchiveRecord[];
  highRated: ArchiveRecord[];
  totalCount: number;
  thisMonthCount: number;
  revisitCount: number;
  highRatedCount: number;
  categoryCounts: Record<string, number>;
  topTags: Array<[string, number]>;
}

export async function getServerDashboardData(
  viewerEmail?: string | null,
): Promise<DashboardData> {
  const admin = createSupabaseAdminClient();
  const ownerId = await resolveAllowedOwnerId();
  const canViewPrivate = isAllowedAdminEmail(viewerEmail);

  function baseDataQuery() {
    let q = admin
      .from(RECORDS_TABLE)
      .select(
        "id, owner_id, title, body, category, subcategory, tags, created_at, updated_at, event_date, importance, source_type, summary, notes, visibility, details",
        { count: "exact" },
      )
      .eq("owner_id", ownerId);
    if (!canViewPrivate) q = q.eq("visibility", "shared");
    return q;
  }

  function baseCountQuery() {
    let q = admin
      .from(RECORDS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);
    if (!canViewPrivate) q = q.eq("visibility", "shared");
    return q;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${currentMonth}-01`;
  const monthEndDate = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0);
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  // Single data query (limit 20) replaces 4 separate data queries.
  // 5 lightweight head-only count queries stay for accurate category totals.
  const [
    recentBatchResult,
    thisMonthResult,
    thoughtsCountResult,
    wordsCountResult,
    contentCountResult,
    placesCountResult,
    activitiesCountResult,
  ] = await Promise.all([
    baseDataQuery()
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    baseCountQuery()
      .gte("event_date", monthStart)
      .lte("event_date", monthEnd),
    baseCountQuery().eq("category", "thoughts"),
    baseCountQuery().eq("category", "words"),
    baseCountQuery().eq("category", "content"),
    baseCountQuery().eq("category", "places"),
    baseCountQuery().eq("category", "activities"),
  ]);

  if (recentBatchResult.error) throw recentBatchResult.error;
  if (thisMonthResult.error) throw thisMonthResult.error;

  const categoryCounts: Record<string, number> = {
    thoughts: thoughtsCountResult.count ?? 0,
    words: wordsCountResult.count ?? 0,
    content: contentCountResult.count ?? 0,
    places: placesCountResult.count ?? 0,
    activities: activitiesCountResult.count ?? 0,
  };

  const allRows = (recentBatchResult.data ?? []) as RecordRow[];
  const recordIds = allRows.map((row) => row.id);

  let signedImageMap = new Map<string, ArchiveImage>();
  if (recordIds.length > 0) {
    const { data: imageRows, error: imageError } = await admin
      .from(IMAGES_TABLE)
      .select("id, record_id, storage_path, caption, alt_text, is_primary, sort_order, created_at")
      .eq("owner_id", ownerId)
      .in("record_id", recordIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (imageError) throw imageError;
    const representativeRows = selectRepresentativeRows((imageRows ?? []) as ImageRow[]);
    signedImageMap = await createThumbnailMap(admin, representativeRows);
  }

  const allRecords = allRows.map((row) =>
    buildListRecord(row, signedImageMap.get(row.id) ?? null),
  );

  const recentRecords = allRecords.slice(0, 4);
  const recentThoughts = allRecords.filter((r) => r.category === "thoughts").slice(0, 3);
  const recentPlaces = allRecords.filter((r) => r.category === "places").slice(0, 2);
  const recentActivities = allRecords.filter((r) => r.category === "activities").slice(0, 2);
  const highRated = allRecords.filter((r) => (r.rating ?? 0) >= 4.5).slice(0, 4);

  return {
    recentRecords,
    recentThoughts,
    recentPlaces,
    recentActivities,
    highRated,
    totalCount: recentBatchResult.count ?? 0,
    thisMonthCount: thisMonthResult.count ?? 0,
    revisitCount: 0,
    highRatedCount: highRated.length,
    categoryCounts,
    topTags: [],
  };
}

function buildListRecord(row: RecordRow, thumbnail: ArchiveImage | null): ArchiveRecord {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const content = normalizeContentDetails(details.content);
  const place = normalizePlaceDetails(details.place);
  const activity = normalizeActivityDetails(details.activity);
  const thought = normalizeThoughtDetails(details.thought);
  const word = normalizeWordDetails(details.word);

  const rating = content?.rating ?? place?.rating ?? activity?.satisfactionRating;
  const locationLabel = place?.placeName ?? activity?.location ?? "";
  const areaLabel = place?.area ?? activity?.location ?? "";
  const revisitCandidate =
    content?.revisitIntent === "yes" ||
    place?.revisitIntent === "yes" ||
    thought?.worthRevisiting === true;
  const headline =
    thought?.oneLineThought ||
    (word?.term && word?.meaning ? `${word.term} · ${word.meaning}` : "") ||
    content?.oneLineReview ||
    place?.oneLineReview ||
    activity?.summary ||
    "";

  return {
    id: typeof row.id === "string" && row.id.trim().length > 0 ? row.id : crypto.randomUUID(),
    title: readString(row.title) ?? "제목 없음",
    body: "",
    category: normalizeCategory(row.category),
    subcategory: readString(row.subcategory) ?? "기타",
    tags: normalizeStringList(row.tags),
    createdAt: readString(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: readString(row.updated_at) ?? readString(row.created_at) ?? new Date(0).toISOString(),
    eventDate: readString(row.event_date) ?? undefined,
    importance: normalizeImportance(row.importance),
    sourceType: normalizeSourceType(row.source_type),
    summary: readString(row.summary) ?? "",
    notes: undefined,
    visibility: normalizeVisibility(row.visibility),
    searchText: buildSearchText(row, content, place, activity, thought, word),
    rating: rating ?? null,
    headline,
    locationLabel,
    areaLabel,
    revisitCandidate,
    thumbnail,
    images: [],
    thought,
    word,
    content,
    place,
    activity,
  };
}

function buildSearchText(
  row: RecordRow,
  content?: ArchiveRecord["content"],
  place?: ArchiveRecord["place"],
  activity?: ArchiveRecord["activity"],
  thought?: ArchiveRecord["thought"],
  word?: ArchiveRecord["word"],
) {
  return [
    row.title,
    row.summary ?? "",
    row.body,
    ...normalizeStringList(row.tags),
    word?.term,
    word?.meaning,
    word?.example,
    content?.titleOriginal,
    content?.oneLineReview,
    ...(content?.memorablePoints ?? []),
    place?.placeName,
    place?.area,
    place?.oneLineReview,
    activity?.location,
    activity?.summary,
    thought?.oneLineThought,
    thought?.expandedNote,
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

  const cachedResults = new Map<number, string>();
  const uncachedIndices: number[] = [];

  rows.forEach((row, index) => {
    const cached = getCachedSignedUrl(row.storage_path);
    if (cached) {
      cachedResults.set(index, cached);
    } else {
      uncachedIndices.push(index);
    }
  });

  let freshUrls: Array<{ signedUrl: string }> = [];
  if (uncachedIndices.length > 0) {
    const uncachedPaths = uncachedIndices.map((i) => rows[i].storage_path);
    const { data, error } = await admin.storage
      .from("record-images")
      .createSignedUrls(uncachedPaths, IMAGE_URL_TTL);

    if (error) {
      throw error;
    }

    freshUrls = data ?? [];
    uncachedIndices.forEach((rowIndex, freshIndex) => {
      const url = freshUrls[freshIndex]?.signedUrl ?? "";
      if (url) {
        setCachedSignedUrl(rows[rowIndex].storage_path, url, IMAGE_URL_TTL);
      }
    });
  }

  const imageMap = new Map<string, ArchiveImage>();
  let freshCounter = 0;
  rows.forEach((row, index) => {
    let url: string;
    if (cachedResults.has(index)) {
      url = cachedResults.get(index)!;
    } else {
      url = freshUrls[freshCounter]?.signedUrl ?? "";
      freshCounter++;
    }

    imageMap.set(row.record_id, {
      id: row.id,
      storagePath: row.storage_path,
      url,
      caption: row.caption ?? undefined,
      altText: row.alt_text ?? undefined,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    });
  });

  return imageMap;
}

function normalizeCategory(value: unknown): ArchiveRecord["category"] {
  return value === "thoughts" || value === "words" || value === "content" || value === "places" || value === "activities"
    ? value
    : "thoughts";
}

function normalizeSourceType(value: unknown): ArchiveRecord["sourceType"] {
  return value === "telegram" || value === "manual" || value === "imported" || value === "assistant"
    ? value
    : "manual";
}

function normalizeVisibility(value: unknown): ArchiveRecord["visibility"] {
  return value === "shared" || value === "private" ? value : "private";
}

function normalizeImportance(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 3;
  }

  return Math.max(1, Math.min(5, Math.round(value)));
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [] as string[];
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeThoughtDetails(value: unknown): ArchiveRecord["thought"] {
  const entry = asObject(value);
  if (!entry) return undefined;

  return {
    thoughtType: readString(entry.thoughtType) ?? "생각",
    oneLineThought: readString(entry.oneLineThought) ?? "",
    expandedNote: readString(entry.expandedNote) ?? "",
    actionNeeded: readBoolean(entry.actionNeeded) ?? false,
    worthRevisiting: readBoolean(entry.worthRevisiting) ?? false,
  };
}

function normalizeWordDetails(value: unknown): ArchiveRecord["word"] {
  const entry = asObject(value);
  if (!entry) return undefined;

  return {
    term: readString(entry.term) ?? "",
    meaning: readString(entry.meaning) ?? "",
    example: readString(entry.example) ?? "",
    whySaved: readString(entry.whySaved) ?? "",
  };
}

function normalizeContentDetails(value: unknown): ArchiveRecord["content"] {
  const entry = asObject(value);
  if (!entry) return undefined;

  const revisitIntent = readString(entry.revisitIntent);
  return {
    contentType: readString(entry.contentType) ?? "콘텐츠",
    titleOriginal: readString(entry.titleOriginal) ?? readString(entry.originalTitle),
    rating: readNumber(entry.rating) ?? 0,
    oneLineReview: readString(entry.oneLineReview) ?? "",
    memorablePoints: normalizeStringList(entry.memorablePoints),
    weakPoints: normalizeStringList(entry.weakPoints),
    memorableQuote: readString(entry.memorableQuote),
    revisitIntent:
      revisitIntent === "yes" || revisitIntent === "no" || revisitIntent === "none" || revisitIntent === "maybe"
        ? (revisitIntent === "no" ? "none" : revisitIntent)
        : "maybe",
  };
}

function normalizePlaceDetails(value: unknown): ArchiveRecord["place"] {
  const entry = asObject(value);
  if (!entry) return undefined;

  const revisitIntent = readString(entry.revisitIntent);
  return {
    placeName: readString(entry.placeName) ?? "",
    area: readString(entry.area) ?? "",
    address: readString(entry.address),
    placeType: readString(entry.placeType) ?? "장소",
    visitDate: readString(entry.visitDate),
    rating: readNumber(entry.rating) ?? 0,
    oneLineReview: readString(entry.oneLineReview) ?? "",
    revisitIntent:
      revisitIntent === "yes" || revisitIntent === "no" || revisitIntent === "none" || revisitIntent === "maybe"
        ? (revisitIntent === "no" ? "none" : revisitIntent)
        : "maybe",
    withWhom: readString(entry.withWhom),
    atmosphereNote: readString(entry.atmosphereNote),
    priceNote: readString(entry.priceNote),
  };
}

function normalizeActivityDetails(value: unknown): ArchiveRecord["activity"] {
  const entry = asObject(value);
  if (!entry) return undefined;

  return {
    activityType: readString(entry.activityType) ?? "활동",
    location: readString(entry.location) ?? "",
    distanceKm: readNumber(entry.distanceKm),
    durationMinutes: readNumber(entry.durationMinutes),
    difficulty: readNumber(entry.difficulty) ?? 0,
    satisfactionRating: readNumber(entry.satisfactionRating) ?? 0,
    physicalConditionNote: readString(entry.physicalConditionNote),
    summary: readString(entry.summary) ?? "",
  };
}
