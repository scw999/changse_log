import type {
  ActivityDetails,
  ArchiveRecord,
  CategoryKey,
  ContentDetails,
  PlaceDetails,
  ThoughtDetails,
  WordDetails,
} from "@/lib/archive/types";

export type InternalIngestPayload = {
  title: string;
  body: string;
  category: CategoryKey;
  subcategory: string;
  tags?: string[];
  summary?: string;
  notes?: string;
  importance?: number;
  event_date?: string;
  source_type?: ArchiveRecord["sourceType"];
  visibility?: ArchiveRecord["visibility"];
  thought?: Partial<ThoughtDetails>;
  word?: Partial<WordDetails>;
  content?: Partial<ContentDetails>;
  place?: Partial<PlaceDetails>;
  activity?: Partial<ActivityDetails>;
  metadata?: Record<string, unknown>;
};

export function parseInternalIngestPayload(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("payload must be a JSON object");
  }

  const payload = input as Record<string, unknown>;
  const category = parseCategory(payload.category);
  const sourceType = parseSourceType(payload.source_type);
  const tags = parseTags(payload.tags);
  const importance = parseImportance(payload.importance);
  const eventDate = parseOptionalDate(payload.event_date);
  const visibility = parseVisibility(payload.visibility);
  const title = parseRequiredString(payload.title, "title");
  const body = parseRequiredString(payload.body, "body");
  const summary = parseOptionalString(payload.summary) ?? title;
  const notes = parseOptionalString(payload.notes);
  const metadata = parseOptionalObject(payload.metadata);

  return {
    title,
    body,
    category,
    subcategory: parseRequiredString(payload.subcategory, "subcategory"),
    tags,
    summary,
    notes,
    importance,
    eventDate,
    sourceType,
    visibility,
    thought: category === "thoughts" ? parseOptionalObject(payload.thought) : undefined,
    word: category === "words" ? parseOptionalObject(payload.word) : undefined,
    content: category === "content" ? parseOptionalObject(payload.content) : undefined,
    place: category === "places" ? parseOptionalObject(payload.place) : undefined,
    activity: category === "activities" ? parseOptionalObject(payload.activity) : undefined,
    metadata,
  };
}

export function buildInternalArchiveInsert(
  ownerId: string,
  payload: ReturnType<typeof parseInternalIngestPayload>,
) {
  return {
    owner_id: ownerId,
    title: payload.title,
    body: payload.body,
    category: payload.category,
    subcategory: payload.subcategory,
    tags: payload.tags,
    event_date: payload.eventDate,
    importance: payload.importance,
    source_type: payload.sourceType,
    visibility: payload.visibility,
    summary: payload.summary,
    notes: payload.notes ?? null,
    details: {
      thought: payload.thought ?? null,
      word: payload.word ?? null,
      content: payload.content ?? null,
      place: payload.place ?? null,
      activity: payload.activity ?? null,
      ingestion: {
        method: "internal_api",
        actor: "assistant",
        received_at: new Date().toISOString(),
        metadata: payload.metadata ?? {},
      },
    },
  };
}

function parseCategory(value: unknown): CategoryKey {
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

function parseSourceType(value: unknown): ArchiveRecord["sourceType"] {
  if (!value) {
    return "assistant";
  }

  if (value === "assistant" || value === "telegram" || value === "manual" || value === "imported") {
    return value;
  }

  throw new Error("source_type must be one of assistant, telegram, manual, imported");
}

function parseVisibility(value: unknown): ArchiveRecord["visibility"] {
  if (!value) {
    return "private";
  }

  if (value === "private" || value === "shared") {
    return value;
  }

  throw new Error("visibility must be one of private, shared");
}

function parseRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("optional string field must be a string");
  }

  return value.trim();
}

function parseTags(value: unknown) {
  if (value === undefined || value === null) {
    return [] as string[];
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

function parseImportance(value: unknown) {
  if (value === undefined || value === null) {
    return 3;
  }

  if (typeof value !== "number" || value < 1 || value > 5) {
    throw new Error("importance must be a number between 1 and 5");
  }

  return Math.round(value);
}

function parseOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("event_date must use YYYY-MM-DD format");
  }

  return value;
}

function parseOptionalObject(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("detail fields must be objects");
  }

  return value as Record<string, unknown>;
}
