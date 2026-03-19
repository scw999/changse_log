import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ArchiveImage, ArchiveRecord } from "@/lib/archive/types";
import { getPrimaryDate, normalizeImages, normalizeRecord, sortRecords } from "@/lib/archive/utils";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";
const BUCKET = "record-images";

export type RecordRow = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: ArchiveRecord["category"];
  subcategory: string;
  tags: string[] | null;
  created_at: string;
  updated_at?: string | null;
  event_date: string | null;
  importance: number;
  source_type: ArchiveRecord["sourceType"];
  summary: string | null;
  notes: string | null;
  visibility: ArchiveRecord["visibility"];
  details: Record<string, unknown> | null;
};

export type ImageRow = {
  id: string;
  record_id: string;
  owner_id: string;
  storage_path: string;
  caption: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export async function fetchRemoteArchiveRecords(
  _client: SupabaseClient,
  _user: User,
) {
  void _client;
  void _user;
  const response = await fetch("/api/archive/records", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "archive_records_fetch_failed");
  }

  const payload = (await response.json()) as { records?: ArchiveRecord[] };
  return sortRecords(payload.records ?? [], "newest");
}

export async function fetchRemoteArchiveRecordDetail(recordId: string) {
  const response = await fetch(`/api/archive/records/${recordId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "archive_record_detail_fetch_failed");
  }

  const payload = (await response.json()) as { record?: ArchiveRecord | null };
  return payload.record ?? null;
}

export async function upsertRemoteArchiveRecord(
  client: SupabaseClient,
  user: User,
  record: ArchiveRecord,
) {
  const normalized = normalizeRecord(record);
  const row = recordToRow(user.id, normalized);

  const { error } = await client.from(RECORDS_TABLE).upsert(row);

  if (error) {
    throw error;
  }
}

export async function deleteRemoteArchiveRecord(
  client: SupabaseClient,
  user: User,
  record: ArchiveRecord,
) {
  for (const image of record.images ?? []) {
    await client.storage.from(BUCKET).remove([image.storagePath]);
  }

  const { error } = await client.from(RECORDS_TABLE).delete().eq("id", record.id).eq("owner_id", user.id);

  if (error) {
    throw error;
  }
}

export async function uploadRemoteRecordImages(
  client: SupabaseClient,
  user: User,
  recordId: string,
  existingImages: ArchiveImage[],
  files: File[],
) {
  const nextSortBase = existingImages.length;
  const uploadedRows: ImageRow[] = [];

  for (const [index, file] of files.entries()) {
    const safeName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, "-")}`;
    const storagePath = `${user.id}/${recordId}/${safeName}`;

    const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, file, {
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const row = {
      record_id: recordId,
      owner_id: user.id,
      storage_path: storagePath,
      caption: "",
      alt_text: "",
      is_primary: false,
      sort_order: nextSortBase + index,
    };

    const { data, error } = await client.from(IMAGES_TABLE).insert(row).select("*").single();

    if (error) {
      throw error;
    }

    uploadedRows.push(data as ImageRow);
  }

  const hydrated = await hydrateImageUrls(client, uploadedRows);
  return normalizeImages(hydrated.map((entry) => entry.image));
}

export async function deleteRemoteImage(
  client: SupabaseClient,
  user: User,
  image: ArchiveImage,
) {
  await client.storage.from(BUCKET).remove([image.storagePath]);

  const { error } = await client
    .from(IMAGES_TABLE)
    .delete()
    .eq("id", image.id)
    .eq("owner_id", user.id);

  if (error) {
    throw error;
  }
}

export async function syncRemoteRecordImages(
  client: SupabaseClient,
  user: User,
  recordId: string,
  images: ArchiveImage[],
) {
  for (const image of images) {
    const { error } = await client
      .from(IMAGES_TABLE)
      .update({
        caption: image.caption ?? "",
        alt_text: image.altText ?? "",
        is_primary: Boolean(image.isPrimary),
        sort_order: image.sortOrder,
      })
      .eq("id", image.id)
      .eq("record_id", recordId)
      .eq("owner_id", user.id);

    if (error) {
      throw error;
    }
  }
}

function recordToRow(ownerId: string, record: ArchiveRecord) {
  return {
    id: record.id,
    owner_id: ownerId,
    title: record.title,
    body: record.body,
    category: record.category,
    subcategory: record.subcategory,
    tags: record.tags,
    created_at: record.createdAt,
    event_date: record.eventDate ?? null,
    importance: record.importance,
    source_type: record.sourceType,
    summary: record.summary,
    notes: record.notes ?? null,
    visibility: record.visibility,
    details: {
      thought: record.thought ?? null,
      word: record.word ?? null,
      content: record.content ?? null,
      place: record.place ?? null,
      activity: record.activity ?? null,
      primaryDate: getPrimaryDate(record),
    },
  };
}

export function rowToRecord(row: RecordRow, images: ArchiveImage[]): ArchiveRecord {
  const details = (row.details ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    title: row.title,
    body: typeof row.body === "string" ? row.body : "",
    category: row.category,
    subcategory: row.subcategory,
    tags: normalizeStringList(row.tags),
    createdAt: row.created_at,
    eventDate: row.event_date ?? undefined,
    updatedAt: row.updated_at ?? row.created_at,
    importance: row.importance,
    sourceType: row.source_type,
    summary: row.summary ?? "",
    notes: row.notes ?? undefined,
    visibility: row.visibility ?? "private",
    images: normalizeImages(images),
    thought: normalizeThoughtDetails(details.thought),
    word: normalizeWordDetails(details.word),
    content: normalizeContentDetails(details.content),
    place: normalizePlaceDetails(details.place),
    activity: normalizeActivityDetails(details.activity),
  };
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

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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

export async function hydrateImageUrls(client: SupabaseClient, rows: ImageRow[]) {
  if (rows.length === 0) {
    return [] as Array<{ recordId: string; image: ArchiveImage }>;
  }

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((row) => row.storage_path), 60 * 60);

  if (error) {
    throw error;
  }

  return rows.map((row, index) => ({
    recordId: row.record_id,
    image: {
      id: row.id,
      storagePath: row.storage_path,
      url: data?.[index]?.signedUrl ?? "",
      caption: row.caption ?? undefined,
      altText: row.alt_text ?? undefined,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    },
  }));
}
