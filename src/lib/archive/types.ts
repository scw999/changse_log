export type CategoryKey =
  | "thoughts"
  | "words"
  | "content"
  | "places"
  | "activities";

export type SourceType = "telegram" | "manual" | "imported" | "assistant";
export type RecordVisibility = "private" | "shared";

export type RevisitIntent = "none" | "maybe" | "yes";

export type SortOption = "newest" | "oldest" | "rating" | "importance";

export interface ThoughtDetails {
  thoughtType: string;
  oneLineThought: string;
  expandedNote: string;
  actionNeeded: boolean;
  worthRevisiting: boolean;
}

export interface WordDetails {
  term: string;
  meaning: string;
  example: string;
  whySaved: string;
}

export interface ContentDetails {
  contentType: string;
  titleOriginal?: string;
  rating: number;
  oneLineReview: string;
  memorablePoints: string[];
  weakPoints?: string[];
  memorableQuote?: string;
  revisitIntent: RevisitIntent;
}

export interface PlaceDetails {
  placeName: string;
  area: string;
  address?: string;
  placeType: string;
  visitDate?: string;
  rating: number;
  oneLineReview: string;
  revisitIntent: RevisitIntent;
  withWhom?: string;
  atmosphereNote?: string;
  priceNote?: string;
}

export interface ActivityDetails {
  activityType: string;
  location: string;
  distanceKm?: number;
  durationMinutes?: number;
  difficulty: number;
  satisfactionRating: number;
  physicalConditionNote?: string;
  summary: string;
}

export interface ArchiveImage {
  id: string;
  storagePath: string;
  url: string;
  caption?: string;
  altText?: string;
  sortOrder: number;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  body: string;
  category: CategoryKey;
  subcategory: string;
  tags: string[];
  createdAt: string;
  eventDate?: string;
  importance: number;
  sourceType: SourceType;
  summary: string;
  notes?: string;
  visibility: RecordVisibility;
  images?: ArchiveImage[];
  thought?: ThoughtDetails;
  word?: WordDetails;
  content?: ContentDetails;
  place?: PlaceDetails;
  activity?: ActivityDetails;
}

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  description: string;
  route: string;
  accentClass: string;
  panelClass: string;
  subcategories: string[];
}

export interface RecordFilterState {
  search: string;
  sort: SortOption;
  subcategory: string;
  tag: string;
  area: string;
  ratingMin: number | null;
  importanceMin: number | null;
  revisitOnly: boolean;
}

export interface ArchiveContextValue {
  records: ArchiveRecord[];
  isReady: boolean;
  isAuthenticated: boolean;
  isRemote: boolean;
  userEmail: string | null;
  upsertRecord: (record: ArchiveRecord) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  resetRecords: () => Promise<void>;
  uploadImages: (recordId: string, files: File[]) => Promise<ArchiveImage[]>;
  updateImages: (recordId: string, images: ArchiveImage[]) => Promise<void>;
  removeImage: (recordId: string, imageId: string) => Promise<void>;
  signOut: () => Promise<void>;
}
