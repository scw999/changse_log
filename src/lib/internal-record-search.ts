type ArchiveSearchRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  subcategory: string;
  tags: string[] | null;
  created_at: string;
  updated_at?: string | null;
  event_date: string | null;
  source_type: string;
  summary: string | null;
  details: Record<string, unknown> | null;
};

type SearchRequestPayload = {
  query: string;
  category?: string;
  limit: number;
};

type CompactInternalRecord = {
  id: string;
  title: string;
  summary: string;
  category: string;
  subcategory: string;
  event_date: string | null;
  created_at: string;
  updated_at?: string | null;
  source_type: string;
  details: {
    content?: {
      originalTitle?: string;
    };
  };
};

const VALID_CATEGORIES = new Set(["thoughts", "words", "content", "places", "activities"]);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export function parseInternalSearchPayload(input: unknown): SearchRequestPayload {
  if (!input || typeof input !== "object") {
    throw new Error("search payload must be a JSON object");
  }

  const payload = input as Record<string, unknown>;
  const query = typeof payload.query === "string" ? payload.query.trim() : "";

  if (!query) {
    throw new Error("query is required");
  }

  const category =
    typeof payload.category === "string" && payload.category.trim().length > 0
      ? payload.category.trim()
      : undefined;

  if (category && !VALID_CATEGORIES.has(category)) {
    throw new Error("category must be one of thoughts, words, content, places, activities");
  }

  return {
    query,
    category,
    limit: parseLimit(payload.limit),
  };
}

export function parseRecentLimit(limitParam: string | null) {
  if (!limitParam) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(limitParam);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT) : DEFAULT_LIMIT;
}

export function rankArchiveSearchResults(rows: ArchiveSearchRow[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  return rows
    .map((row) => ({
      row,
      score: computeSearchScore(row, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightDate = right.row.updated_at ?? right.row.created_at;
      const leftDate = left.row.updated_at ?? left.row.created_at;
      return rightDate.localeCompare(leftDate);
    })
    .map((entry) => entry.row);
}

export function toCompactInternalRecord(row: ArchiveSearchRow): CompactInternalRecord {
  const originalTitle = extractOriginalTitle(row.details);

  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    category: row.category,
    subcategory: row.subcategory,
    event_date: row.event_date,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    source_type: row.source_type,
    details: originalTitle
      ? {
          content: {
            originalTitle,
          },
        }
      : {},
  };
}

function computeSearchScore(row: ArchiveSearchRow, normalizedQuery: string) {
  let score = 0;
  const title = normalizeSearchText(row.title);
  const summary = normalizeSearchText(row.summary ?? "");
  const body = normalizeSearchText(row.body);
  const tags = (row.tags ?? []).map(normalizeSearchText);
  const originalTitle = normalizeSearchText(extractOriginalTitle(row.details) ?? "");

  if (title.includes(normalizedQuery)) {
    score += title === normalizedQuery ? 120 : 90;
  }

  if (originalTitle.includes(normalizedQuery)) {
    score += originalTitle === normalizedQuery ? 100 : 70;
  }

  if (summary.includes(normalizedQuery)) {
    score += 50;
  }

  if (body.includes(normalizedQuery)) {
    score += 30;
  }

  if (tags.some((tag) => tag.includes(normalizedQuery))) {
    score += 25;
  }

  return score;
}

function extractOriginalTitle(details: Record<string, unknown> | null) {
  const content = details?.content;

  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return undefined;
  }

  const record = content as Record<string, unknown>;
  const originalTitle =
    (typeof record.originalTitle === "string" && record.originalTitle.trim()) ||
    (typeof record.titleOriginal === "string" && record.titleOriginal.trim()) ||
    "";

  return originalTitle || undefined;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function parseLimit(value: unknown) {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("limit must be a number");
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}
