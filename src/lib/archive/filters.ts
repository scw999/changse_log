import { ArchiveRecord, RecordFilterState } from "@/lib/archive/types";
import {
  getRecordArea,
  getRecordRating,
  getRecordRevisitIntent,
  getSearchableText,
  sortRecords,
} from "@/lib/archive/utils";

export function filterRecords(records: ArchiveRecord[], filters: RecordFilterState) {
  const search = filters.search.trim().toLowerCase();

  return sortRecords(
    records.filter((record) => {
      if (search && !getSearchableText(record).includes(search)) {
        return false;
      }

      if (filters.subcategory !== "all" && record.subcategory !== filters.subcategory) {
        return false;
      }

      if (filters.tag !== "all" && !record.tags.includes(filters.tag)) {
        return false;
      }

      if (filters.area !== "all" && getRecordArea(record) !== filters.area) {
        return false;
      }

      if (filters.month !== "all") {
        const primaryMonth = (record.eventDate ?? record.createdAt).slice(0, 7);

        if (primaryMonth !== filters.month) {
          return false;
        }
      }

      if (filters.ratingMin !== null) {
        const rating = getRecordRating(record);

        if (rating === null || rating < filters.ratingMin) {
          return false;
        }
      }

      if (filters.importanceMin !== null && record.importance < filters.importanceMin) {
        return false;
      }

      if (filters.revisitOnly && getRecordRevisitIntent(record) !== "yes") {
        return false;
      }

      return true;
    }),
    filters.sort,
  );
}

export function collectFilterOptions(records: ArchiveRecord[]) {
  return {
    subcategories: unique(records.map((record) => record.subcategory)),
    tags: unique(records.flatMap((record) => record.tags)),
    areas: unique(records.map(getRecordArea).filter(Boolean)),
  };
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "ko"));
}
