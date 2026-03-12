import { CategoryKey, CategoryMeta, RecordFilterState, RevisitIntent, SourceType } from "@/lib/archive/types";

export const CATEGORY_ORDER: CategoryKey[] = [
  "thoughts",
  "words",
  "content",
  "places",
  "activities",
];

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  thoughts: {
    key: "thoughts",
    label: "생각",
    description: "생각, 아이디어, 메모, 회고를 조용히 축적하는 공간",
    route: "/thoughts",
    accentClass: "from-rose-500/25 via-orange-300/20 to-transparent",
    panelClass: "border-rose-200/70 bg-rose-50/80",
    subcategories: ["생각", "아이디어", "리플렉션", "메모"],
  },
  words: {
    key: "words",
    label: "단어",
    description: "표현과 어휘, 조어와 문장을 모아두는 언어 아카이브",
    route: "/words",
    accentClass: "from-amber-500/25 via-yellow-300/20 to-transparent",
    panelClass: "border-amber-200/80 bg-amber-50/85",
    subcategories: ["어휘", "표현", "조어", "기억할 문장"],
  },
  content: {
    key: "content",
    label: "콘텐츠",
    description: "영화, 책, 드라마, 영상을 다시 꺼내 보는 감상 아카이브",
    route: "/content",
    accentClass: "from-indigo-500/20 via-sky-300/20 to-transparent",
    panelClass: "border-sky-200/80 bg-sky-50/80",
    subcategories: ["영화", "책", "드라마", "영상"],
  },
  places: {
    key: "places",
    label: "장소",
    description: "식당, 카페, 여행지, 데이트 장소를 온도 있게 다시 보는 기록",
    route: "/places",
    accentClass: "from-emerald-500/20 via-teal-300/20 to-transparent",
    panelClass: "border-emerald-200/80 bg-emerald-50/80",
    subcategories: ["레스토랑", "카페", "여행지", "데이트", "방문지"],
  },
  activities: {
    key: "activities",
    label: "활동",
    description: "운동, 산책, 걷기, 등산 기록을 몸의 감각과 함께 정리하는 로그",
    route: "/activities",
    accentClass: "from-violet-500/20 via-fuchsia-300/20 to-transparent",
    panelClass: "border-violet-200/80 bg-violet-50/80",
    subcategories: ["운동", "등산", "러닝", "산책", "트래킹"],
  },
};

export const DEFAULT_FILTERS: RecordFilterState = {
  search: "",
  sort: "newest",
  subcategory: "all",
  tag: "all",
  area: "all",
  ratingMin: null,
  importanceMin: null,
  revisitOnly: false,
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  telegram: "텔레그램",
  manual: "수동 입력",
  imported: "가져오기",
  assistant: "창세봇 저장",
};

export const REVISIT_LABELS: Record<RevisitIntent, string> = {
  none: "없음",
  maybe: "고민 중",
  yes: "다시 보고 싶음",
};

export const IMPORTANCE_LABELS = [
  "기록용",
  "가벼운 메모",
  "꺼내볼 가치",
  "자주 다시 볼 것",
  "중요 기록",
];

export const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/recent", label: "최근 기록" },
  { href: "/thoughts", label: "생각" },
  { href: "/words", label: "단어" },
  { href: "/content", label: "콘텐츠" },
  { href: "/places", label: "장소" },
  { href: "/activities", label: "활동" },
  { href: "/review", label: "리뷰" },
  { href: "/admin", label: "관리자" },
];
