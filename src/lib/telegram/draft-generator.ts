import type { CategoryKey, ArchiveRecord } from "@/lib/archive/types";

type DraftSeed = {
  category: CategoryKey;
  subcategory: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  details: Record<string, unknown>;
};

const CATEGORY_KEYWORDS: Array<{
  category: CategoryKey;
  keywords: string[];
  subcategory: string;
}> = [
  { category: "places", keywords: ["카페", "식당", "레스토랑", "브런치", "방문", "성수", "연남"], subcategory: "방문지" },
  { category: "content", keywords: ["영화", "책", "드라마", "유튜브", "영상", "넷플릭스"], subcategory: "영화" },
  { category: "activities", keywords: ["러닝", "런닝", "운동", "헬스", "등산", "산책", "걷기"], subcategory: "운동" },
  { category: "words", keywords: ["단어", "표현", "문장", "어휘", "뜻"], subcategory: "어휘" },
  { category: "thoughts", keywords: ["생각", "아이디어", "메모", "회고"], subcategory: "생각" },
];

export function buildStructuredDraft(rawText: string): DraftSeed {
  const normalized = rawText.trim();
  const category = inferCategory(normalized);
  const summary = truncate(normalized, 110);
  const title = createTitle(normalized, category.category);
  const tags = extractTags(normalized, category.category);

  return {
    category: category.category,
    subcategory: category.subcategory,
    title,
    summary,
    body: normalized,
    tags,
    details: createDetailPayload(category.category, normalized),
  };
}

export function buildArchiveDetails(
  category: CategoryKey,
  details: Record<string, unknown>,
): Partial<Record<keyof ArchiveRecord, unknown>> {
  switch (category) {
    case "thoughts":
      return { thought: details };
    case "words":
      return { word: details };
    case "content":
      return { content: details };
    case "places":
      return { place: details };
    case "activities":
      return { activity: details };
    default:
      return {};
  }
}

function inferCategory(rawText: string) {
  const lowered = rawText.toLowerCase();

  for (const item of CATEGORY_KEYWORDS) {
    if (item.keywords.some((keyword) => lowered.includes(keyword.toLowerCase()))) {
      return item;
    }
  }

  return CATEGORY_KEYWORDS[CATEGORY_KEYWORDS.length - 1];
}

function createTitle(rawText: string, category: CategoryKey) {
  const prefixMap: Record<CategoryKey, string> = {
    thoughts: "메모",
    words: "단어 기록",
    content: "콘텐츠 기록",
    places: "장소 기록",
    activities: "활동 기록",
  };

  return `${prefixMap[category]}: ${truncate(rawText.replace(/\s+/g, " "), 28)}`;
}

function extractTags(rawText: string, category: CategoryKey) {
  const matches = rawText.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  const tags = matches.map((item) => item.replace(/^#/, ""));

  if (tags.length > 0) {
    return tags.slice(0, 6);
  }

  return [category];
}

function createDetailPayload(category: CategoryKey, rawText: string) {
  const rating = extractRating(rawText);

  switch (category) {
    case "places":
      return {
        placeName: "",
        area: "",
        address: "",
        placeType: "기타",
        visitDate: new Date().toISOString().slice(0, 10),
        rating,
        oneLineReview: truncate(rawText, 80),
        revisitIntent: /다시|재방문/.test(rawText) ? "yes" : "maybe",
        withWhom: "",
        atmosphereNote: "",
        priceNote: "",
      };
    case "content":
      return {
        contentType: "기타",
        titleOriginal: "",
        rating,
        oneLineReview: truncate(rawText, 80),
        memorablePoints: [],
        weakPoints: [],
        memorableQuote: "",
        revisitIntent: /다시|재독|재시청/.test(rawText) ? "yes" : "maybe",
      };
    case "activities":
      return {
        activityType: "기록",
        location: "",
        distanceKm: undefined,
        durationMinutes: undefined,
        difficulty: 3,
        satisfactionRating: rating,
        physicalConditionNote: "",
        summary: truncate(rawText, 90),
      };
    case "words":
      return {
        term: extractFirstWord(rawText),
        meaning: "",
        example: rawText,
        whySaved: "",
      };
    case "thoughts":
    default:
      return {
        thoughtType: "메모",
        oneLineThought: truncate(rawText, 70),
        expandedNote: rawText,
        actionNeeded: /해야|할 것|TODO/i.test(rawText),
        worthRevisiting: /다시|중요|기억/.test(rawText),
      };
  }
}

function extractRating(rawText: string) {
  const match = rawText.match(/([0-5](?:\.[05])?)\s*(점|별)?/);
  return match ? Number(match[1]) : 0;
}

function extractFirstWord(rawText: string) {
  const [first = ""] = rawText.split(/\s+/);
  return first.slice(0, 30);
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value;
}
