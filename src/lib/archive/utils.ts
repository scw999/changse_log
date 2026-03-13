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

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatShortDate(value?: string) {
  if (!value) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatMonth(value?: string) {
  if (!value) {
    return "기록 시점 미정";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(new Date(value));
}

export function getCategoryMeta(category: CategoryKey) {
  return CATEGORY_META[category];
}

export function getRecordRating(record: ArchiveRecord) {
  return (
    record.content?.rating ??
    record.place?.rating ??
    record.activity?.satisfactionRating ??
    null
  );
}

export function getRecordArea(record: ArchiveRecord) {
  return record.place?.area ?? record.activity?.location ?? "";
}

export function getRecordLocationLabel(record: ArchiveRecord) {
  return record.place?.placeName ?? record.activity?.location ?? "";
}

export function getRecordRevisitIntent(record: ArchiveRecord): RevisitIntent | null {
  return (
    record.content?.revisitIntent ??
    record.place?.revisitIntent ??
    (record.thought?.worthRevisiting ? "yes" : null)
  );
}

export function isRevisitCandidate(record: ArchiveRecord) {
  return getRecordRevisitIntent(record) === "yes";
}

export function getImportanceLabel(importance: number) {
  return IMPORTANCE_LABELS[Math.max(0, Math.min(importance - 1, IMPORTANCE_LABELS.length - 1))];
}

export function getSourceLabel(record: ArchiveRecord) {
  return SOURCE_LABELS[record.sourceType];
}

export function getSearchableText(record: ArchiveRecord) {
  return [
    record.title,
    record.body,
    record.summary,
    record.notes,
    record.subcategory,
    record.tags.join(" "),
    record.word?.term,
    record.word?.meaning,
    record.word?.example,
    record.content?.titleOriginal,
    record.content?.oneLineReview,
    record.content?.memorablePoints.join(" "),
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
      return right.importance - left.importance;
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
    parts.push(`${rating.toFixed(1)}점`);
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
    tags: normalizeTags(record.tags),
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
      isPrimary: index === 0,
    }));
}

export function getRepresentativeImage(record: Pick<ArchiveRecord, "images">) {
  const images = normalizeImages(record.images ?? []);
  return images[0] ?? null;
}

export function setPrimaryImage(images: ArchiveImage[], imageId: string) {
  const ordered = normalizeImages(images);
  const targetIndex = ordered.findIndex((image) => image.id === imageId);

  if (targetIndex <= 0) {
    return ordered;
  }

  const next = [...ordered];
  const [target] = next.splice(targetIndex, 1);
  next.unshift(target);
  return normalizeImages(next);
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
