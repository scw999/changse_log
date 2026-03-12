import type { CategoryKey } from "@/lib/archive/types";

type ExistingRecordRow = {
  title: string;
  body: string;
  category: string;
  subcategory: string;
  tags: string[] | null;
  event_date: string | null;
  importance: number;
  source_type: string;
  summary: string | null;
  notes: string | null;
  details: Record<string, unknown> | null;
};

export type InternalRecordPatch = {
  title?: string;
  body?: string;
  category?: CategoryKey;
  subcategory?: string;
  tags?: string[];
  summary?: string;
  notes?: string | null;
  eventDate?: string | null;
  importance?: number;
  details?: Record<string, unknown>;
  thought?: Record<string, unknown>;
  word?: Record<string, unknown>;
  content?: Record<string, unknown>;
  place?: Record<string, unknown>;
  activity?: Record<string, unknown>;
};

export function parseInternalRecordPatch(input: unknown): InternalRecordPatch {
  if (!input || typeof input !== "object") {
    throw new Error("patch payload must be a JSON object");
  }

  const payload = input as Record<string, unknown>;

  return {
    title: parseOptionalString(payload.title),
    body: parseOptionalString(payload.body),
    category: parseOptionalCategory(payload.category),
    subcategory: parseOptionalString(payload.subcategory),
    tags: parseOptionalTags(payload.tags),
    summary: parseOptionalString(payload.summary),
    notes: parseNullableString(payload.notes),
    eventDate: parseOptionalDate(payload.event_date),
    importance: parseOptionalImportance(payload.importance),
    details: parseOptionalObject(payload.details),
    thought: parseOptionalObject(payload.thought),
    word: parseOptionalObject(payload.word),
    content: parseOptionalObject(payload.content),
    place: parseOptionalObject(payload.place),
    activity: parseOptionalObject(payload.activity),
  };
}

export function serializeArchiveRecord(
  ownerId: string,
  existing: ExistingRecordRow,
  patch: InternalRecordPatch,
) {
  const currentDetails = (existing.details ?? {}) as Record<string, unknown>;

  return {
    owner_id: ownerId,
    title: patch.title ?? existing.title,
    body: patch.body ?? existing.body,
    category: patch.category ?? existing.category,
    subcategory: patch.subcategory ?? existing.subcategory,
    tags: patch.tags ?? existing.tags ?? [],
    event_date: patch.eventDate === undefined ? existing.event_date : patch.eventDate,
    importance: patch.importance ?? existing.importance,
    summary: patch.summary ?? existing.summary ?? "",
    notes: patch.notes === undefined ? existing.notes : patch.notes,
    details: {
      ...currentDetails,
      ...(patch.details ?? {}),
      thought: patch.thought ?? currentDetails.thought ?? null,
      word: patch.word ?? currentDetails.word ?? null,
      content: patch.content ?? currentDetails.content ?? null,
      place: patch.place ?? currentDetails.place ?? null,
      activity: patch.activity ?? currentDetails.activity ?? null,
      ingestion: {
        ...((currentDetails.ingestion as Record<string, unknown> | undefined) ?? {}),
        method: "internal_api",
        actor: "assistant",
        updated_at: new Date().toISOString(),
      },
    },
  };
}

function parseOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("optional string fields must be non-empty strings");
  }

  return value.trim();
}

function parseNullableString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("notes must be a string or null");
  }

  return value.trim();
}

function parseOptionalCategory(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === "thoughts" ||
    value === "words" ||
    value === "content" ||
    value === "places" ||
    value === "activities"
  ) {
    return value;
  }

  throw new Error("category must be one of thoughts, words, content, places, activities");
}

function parseOptionalTags(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("tags must be an array of strings");
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("event_date must use YYYY-MM-DD format");
  }

  return value;
}

function parseOptionalImportance(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || value < 1 || value > 5) {
    throw new Error("importance must be a number between 1 and 5");
  }

  return Math.round(value);
}

function parseOptionalObject(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("detail patches must be objects");
  }

  return value as Record<string, unknown>;
}
