import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ArchiveImage, ArchiveRecord } from "@/lib/archive/types";
import { getPrimaryDate, normalizeRecord, sortRecords } from "@/lib/archive/utils";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";
const BUCKET = "record-images";

type RecordRow = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: ArchiveRecord["category"];
  subcategory: string;
  tags: string[] | null;
  created_at: string;
  event_date: string | null;
  importance: number;
  source_type: ArchiveRecord["sourceType"];
  summary: string | null;
  notes: string | null;
  details: Record<string, unknown> | null;
};

type ImageRow = {
  id: string;
  record_id: string;
  owner_id: string;
  storage_path: string;
  caption: string | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export async function fetchRemoteArchiveRecords(
  client: SupabaseClient,
  user: User,
) {
  const { data: rows, error } = await client
    .from(RECORDS_TABLE)
    .select("*")
    .eq("owner_id", user.id)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const recordRows = (rows ?? []) as RecordRow[];

  const { data: imageRows, error: imageError } = await client
    .from(IMAGES_TABLE)
    .select("*")
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    throw imageError;
  }

  const images = await hydrateImageUrls(client, (imageRows ?? []) as ImageRow[]);

  const imagesByRecord = new Map<string, ArchiveImage[]>();
  for (const image of images) {
    const list = imagesByRecord.get(image.recordId) ?? [];
    list.push(image.image);
    imagesByRecord.set(image.recordId, list);
  }

  const records = recordRows.map((row) => rowToRecord(row, imagesByRecord.get(row.id) ?? []));
  return sortRecords(records, "newest");
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
      sort_order: nextSortBase + index,
    };

    const { data, error } = await client.from(IMAGES_TABLE).insert(row).select("*").single();

    if (error) {
      throw error;
    }

    uploadedRows.push(data as ImageRow);
  }

  const hydrated = await hydrateImageUrls(client, uploadedRows);
  return hydrated.map((entry) => entry.image);
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

function rowToRecord(row: RecordRow, images: ArchiveImage[]): ArchiveRecord {
  const details = (row.details ?? {}) as {
    thought?: ArchiveRecord["thought"];
    word?: ArchiveRecord["word"];
    content?: ArchiveRecord["content"];
    place?: ArchiveRecord["place"];
    activity?: ArchiveRecord["activity"];
  };

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    subcategory: row.subcategory,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    eventDate: row.event_date ?? undefined,
    importance: row.importance,
    sourceType: row.source_type,
    summary: row.summary ?? "",
    notes: row.notes ?? undefined,
    images,
    thought: details.thought,
    word: details.word,
    content: details.content,
    place: details.place,
    activity: details.activity,
  };
}

async function hydrateImageUrls(client: SupabaseClient, rows: ImageRow[]) {
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
      createdAt: row.created_at,
    },
  }));
}
