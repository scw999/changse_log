import { CATEGORY_META, IMPORTANCE_LABELS, SOURCE_LABELS } from "@/lib/archive/config";
import {
  ActivityDetails,
  ArchiveImage,
  ArchiveRecord,
  CategoryKey,
  ContentDetails,
  PlaceDetails,
  RevisitIntent,
  SortOption,
  ThoughtDetails,
  WordDetails,
} from "@/lib/archive/types";

export function formatDate(value?: string) {
  if (!value) {
    return "날짜 없음";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatShortDate(value?: string) {
  if (!value) {
    return "날짜 없음";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function formatMonth(value?: string) {
  if (!value) {
    return "기록 시점 미정";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "기록 시점 미정";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(parsed);
}

export function getCategoryMeta(category: CategoryKey) {
  return CATEGORY_META[category];
}

export function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function safeFixed(value: unknown, digits: number, fallback = "-") {
  const normalized = toFiniteNumber(value);

  return normalized === null ? fallback : normalized.toFixed(digits);
}

export function getRecordRating(record: ArchiveRecord) {
  const value =
    toFiniteNumber(record.rating) ??
    toFiniteNumber(record.content?.rating) ??
    toFiniteNumber(record.place?.rating) ??
    toFiniteNumber(record.activity?.satisfactionRating) ??
    null;
  return typeof value === "number" ? value : null;
}

export function getRecordArea(record: ArchiveRecord) {
  return record.areaLabel ?? record.place?.area ?? record.activity?.location ?? "";
}

export function getRecordLocationLabel(record: ArchiveRecord) {
  return record.locationLabel ?? record.place?.placeName ?? record.activity?.location ?? "";
}

export function getRecordRevisitIntent(record: ArchiveRecord): RevisitIntent | null {
  return (
    record.content?.revisitIntent ??
    record.place?.revisitIntent ??
    (record.thought?.worthRevisiting ? "yes" : null)
  );
}

export function isRevisitCandidate(record: ArchiveRecord) {
  return record.revisitCandidate ?? getRecordRevisitIntent(record) === "yes";
}

export function getImportanceLabel(importance: unknown) {
  const n = toFiniteNumber(importance) ?? 1;
  return IMPORTANCE_LABELS[Math.max(0, Math.min(n - 1, IMPORTANCE_LABELS.length - 1))];
}

export function getSourceLabel(record: ArchiveRecord) {
  return SOURCE_LABELS[record.sourceType] ?? record.sourceType ?? "알 수 없음";
}

export function getSearchableText(record: ArchiveRecord) {
  if (record.searchText) {
    return record.searchText.toLowerCase();
  }

  return [
    record.title,
    record.body,
    record.summary,
    record.notes,
    record.subcategory,
    Array.isArray(record.tags) ? record.tags.join(" ") : "",
    record.word?.term,
    record.word?.meaning,
    record.word?.example,
    record.content?.titleOriginal,
    record.content?.oneLineReview,
    joinUnknownList(record.content?.memorablePoints),
    record.place?.placeName,
    record.place?.area,
    record.place?.oneLineReview,
    record.activity?.location,
    record.activity?.summary,
    record.thought?.oneLineThought,
    record.thought?.expandedNote,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function joinUnknownList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" ");
  }

  return typeof value === "string" ? value.trim() : "";
}

export function sortRecords(records: ArchiveRecord[], sort: SortOption) {
  const copied = [...records];

  copied.sort((left, right) => {
    if (sort === "oldest") {
      return getPrimaryDate(left).localeCompare(getPrimaryDate(right));
    }

    if (sort === "rating") {
      return (getRecordRating(right) ?? -1) - (getRecordRating(left) ?? -1);
    }

    if (sort === "importance") {
      return (toFiniteNumber(right.importance) ?? 0) - (toFiniteNumber(left.importance) ?? 0);
    }

    return getPrimaryDate(right).localeCompare(getPrimaryDate(left));
  });

  return copied;
}

export function getPrimaryDate(record: ArchiveRecord) {
  return record.eventDate ?? record.createdAt;
}

export function groupRecordsByMonth(records: ArchiveRecord[]) {
  const groups = new Map<string, ArchiveRecord[]>();

  for (const record of sortRecords(records, "newest")) {
    const key = formatMonth(getPrimaryDate(record));
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([month, items]) => ({ month, items }));
}

export function getRecordMetaLine(record: ArchiveRecord) {
  const parts = [getCategoryMeta(record.category).label, record.subcategory, formatShortDate(getPrimaryDate(record))];
  const rating = getRecordRating(record);

  if (rating !== null) {
    parts.push(`${safeFixed(rating, 1, "0.0")}점`);
  }

  return parts.join(" · ");
}

export function createEmptyRecord(category: CategoryKey = "thoughts"): ArchiveRecord {
  const base: ArchiveRecord = {
    id: "",
    title: "",
    body: "",
    category,
    subcategory: CATEGORY_META[category].subcategories[0],
    tags: [],
    createdAt: new Date().toISOString(),
    eventDate: new Date().toISOString().slice(0, 10),
    importance: 3,
    sourceType: "manual",
    summary: "",
    notes: "",
    visibility: "private",
    images: [],
  };

  if (category === "thoughts") {
    base.thought = createThoughtDetails();
  }

  if (category === "words") {
    base.word = createWordDetails();
  }

  if (category === "content") {
    base.content = createContentDetails();
  }

  if (category === "places") {
    base.place = createPlaceDetails();
  }

  if (category === "activities") {
    base.activity = createActivityDetails();
  }

  return base;
}

export function cloneRecord(record: ArchiveRecord) {
  return structuredClone(record);
}

export function normalizeRecord(record: ArchiveRecord) {
  return {
    ...record,
    title: record.title.trim(),
    body: record.body.trim(),
    summary: record.summary.trim(),
    notes: record.notes?.trim(),
    visibility: record.visibility ?? "private",
    tags: normalizeTags(Array.isArray(record.tags) ? record.tags : []),
    images: record.images ?? [],
  };
}

export function createThoughtDetails(): ThoughtDetails {
  return {
    thoughtType: "생각",
    oneLineThought: "",
    expandedNote: "",
    actionNeeded: false,
    worthRevisiting: false,
  };
}

export function createWordDetails(): WordDetails {
  return {
    term: "",
    meaning: "",
    example: "",
    whySaved: "",
  };
}

export function createContentDetails(): ContentDetails {
  return {
    contentType: "영화",
    titleOriginal: "",
    rating: 4,
    oneLineReview: "",
    memorablePoints: [],
    weakPoints: [],
    memorableQuote: "",
    revisitIntent: "maybe",
  };
}

export function createPlaceDetails(): PlaceDetails {
  return {
    placeName: "",
    area: "",
    address: "",
    placeType: "레스토랑",
    visitDate: new Date().toISOString().slice(0, 10),
    rating: 4,
    oneLineReview: "",
    revisitIntent: "maybe",
    withWhom: "",
    atmosphereNote: "",
    priceNote: "",
  };
}

export function createActivityDetails(): ActivityDetails {
  return {
    activityType: "운동",
    location: "",
    distanceKm: 0,
    durationMinutes: 0,
    difficulty: 3,
    satisfactionRating: 4,
    physicalConditionNote: "",
    summary: "",
  };
}

export function getTypeSpecificHeadline(record: ArchiveRecord) {
  if (record.headline) {
    return record.headline;
  }

  if (record.thought) {
    return record.thought.oneLineThought;
  }

  if (record.word) {
    return `${record.word.term} · ${record.word.meaning}`;
  }

  if (record.content) {
    return record.content.oneLineReview;
  }

  if (record.place) {
    return record.place.oneLineReview;
  }

  if (record.activity) {
    return record.activity.summary;
  }

  return "";
}

export function normalizeImages(images: ArchiveImage[] = []) {
  return [...images]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
    })
    .map((image, index) => ({
      ...image,
      sortOrder: index,
      isPrimary: Boolean(image.isPrimary),
    }));
}

export function getRepresentativeImage(record: Pick<ArchiveRecord, "images">) {
  const thumbnailRecord = record as ArchiveRecord;
  if (thumbnailRecord.thumbnail?.url) {
    return thumbnailRecord.thumbnail;
  }

  const images = normalizeImages(record.images ?? []);
  return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

export function setPrimaryImage(images: ArchiveImage[], imageId: string) {
  return normalizeImages(
    images.map((image) => ({
      ...image,
      isPrimary: image.id === imageId,
    })),
  );
}

export function moveImageToOrder(images: ArchiveImage[], imageId: string, nextOrder: number) {
  const ordered = normalizeImages(images);
  const currentIndex = ordered.findIndex((image) => image.id === imageId);

  if (currentIndex < 0) {
    return ordered;
  }

  const bounded = Math.max(0, Math.min(nextOrder, ordered.length - 1));
  const next = [...ordered];
  const [target] = next.splice(currentIndex, 1);
  next.splice(bounded, 0, target);
  return normalizeImages(next);
}
