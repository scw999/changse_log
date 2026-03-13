"use client";

import { useDeferredValue, useState } from "react";

import { RecordCard } from "@/components/archive/record-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { DEFAULT_FILTERS } from "@/lib/archive/config";
import { useArchive } from "@/lib/archive/context";
import { collectFilterOptions, filterRecords } from "@/lib/archive/filters";
import { CategoryKey, RecordFilterState } from "@/lib/archive/types";
import { getRecordRating, getRecordRevisitIntent } from "@/lib/archive/utils";

interface RecordExplorerProps {
  category?: CategoryKey;
  emptyTitle: string;
  emptyDescription: string;
  initialTag?: string;
  initialQuery?: string;
  initialMonth?: string;
  initialRatingMin?: number | null;
  initialRevisitOnly?: boolean;
}

export function RecordExplorer({
  category,
  emptyTitle,
  emptyDescription,
  initialTag,
  initialQuery,
  initialMonth,
  initialRatingMin,
  initialRevisitOnly,
}: Readonly<RecordExplorerProps>) {
  const { records, isReady } = useArchive();
  const [filters, setFilters] = useState<RecordFilterState>(() => ({
    ...DEFAULT_FILTERS,
    tag: initialTag && initialTag.trim().length > 0 ? initialTag : "all",
    search: initialQuery && initialQuery.trim().length > 0 ? initialQuery : "",
    month: initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : "all",
    ratingMin: typeof initialRatingMin === "number" ? initialRatingMin : null,
    revisitOnly: Boolean(initialRevisitOnly),
  }));

  const deferredSearch = useDeferredValue(filters.search);
  const scopedRecords = category ? records.filter((record) => record.category === category) : records;
  const options = collectFilterOptions(scopedRecords);
  const monthOptions = collectMonthOptions(scopedRecords);
  const filteredRecords = filterRecords(scopedRecords, { ...filters, search: deferredSearch });

  const highRatedCount = scopedRecords.filter((record) => (getRecordRating(record) ?? 0) >= 4.5).length;
  const revisitCount = scopedRecords.filter((record) => getRecordRevisitIntent(record) === "yes").length;
  const ratedCount = scopedRecords.filter((record) => getRecordRating(record) !== null).length;

  function updateFilter<Key extends keyof RecordFilterState>(key: Key, value: RecordFilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Search and filters"
        description="Trim the archive down quickly with text search, sort, month, tag, area, rating, and revisit signals."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-stone-500">
              Search
            </span>
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Title, summary, body, tag, place, word..."
              className="field"
            />
          </label>

          <SelectField
            label="Sort"
            value={filters.sort}
            onChange={(value) => updateFilter("sort", value as RecordFilterState["sort"])}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "rating", label: "Highest rated" },
              { value: "importance", label: "Most important" },
            ]}
          />

          <SelectField
            label="Type"
            value={filters.subcategory}
            onChange={(value) => updateFilter("subcategory", value)}
            options={[
              { value: "all", label: "All types" },
              ...options.subcategories.map((subcategory) => ({
                value: subcategory,
                label: subcategory,
              })),
            ]}
          />

          <SelectField
            label="Tag"
            value={filters.tag}
            onChange={(value) => updateFilter("tag", value)}
            options={[
              { value: "all", label: "All tags" },
              ...options.tags.map((tag) => ({
                value: tag,
                label: `#${tag}`,
              })),
            ]}
          />

          <SelectField
            label="Month"
            value={filters.month}
            onChange={(value) => updateFilter("month", value)}
            options={[
              { value: "all", label: "All months" },
              ...monthOptions.map((month) => ({
                value: month,
                label: month,
              })),
            ]}
          />

          <SelectField
            label="Importance"
            value={filters.importanceMin === null ? "all" : String(filters.importanceMin)}
            onChange={(value) =>
              updateFilter("importanceMin", value === "all" ? null : Number(value))
            }
            options={[
              { value: "all", label: "Any importance" },
              { value: "3", label: "3 and up" },
              { value: "4", label: "4 and up" },
              { value: "5", label: "Only 5" },
            ]}
          />

          {options.areas.length > 0 ? (
            <SelectField
              label="Area"
              value={filters.area}
              onChange={(value) => updateFilter("area", value)}
              options={[
                { value: "all", label: "All areas" },
                ...options.areas.map((area) => ({ value: area, label: area })),
              ]}
            />
          ) : null}

          {ratedCount > 0 ? (
            <SelectField
              label="Rating"
              value={filters.ratingMin === null ? "all" : String(filters.ratingMin)}
              onChange={(value) =>
                updateFilter("ratingMin", value === "all" ? null : Number(value))
              }
              options={[
                { value: "all", label: "Any rating" },
                { value: "3.5", label: "3.5 and up" },
                { value: "4", label: "4.0 and up" },
                { value: "4.5", label: "4.5 and up" },
              ]}
            />
          ) : null}
        </div>

        <label className="mt-4 inline-flex items-start gap-2 text-sm leading-6 text-stone-600">
          <input
            type="checkbox"
            checked={filters.revisitOnly}
            onChange={(event) => updateFilter("revisitOnly", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
          />
          Show only records marked as worth revisiting.
        </label>

        {filters.search !== deferredSearch ? (
          <p className="mt-3 text-xs text-stone-500">Updating results...</p>
        ) : null}
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Visible Records"
          value={`${filteredRecords.length}`}
          note={`Showing ${filteredRecords.length} of ${scopedRecords.length} records in this scope.`}
        />
        <StatCard
          label="High Rated"
          value={`${highRatedCount}`}
          note="Records with a rating of 4.5 or higher."
        />
        <StatCard
          label="Revisit"
          value={`${revisitCount}`}
          note="Records already marked as worth returning to."
        />
        <StatCard
          label="Tags"
          value={`${options.tags.length}`}
          note="Unique tags available in the current record set."
        />
      </div>

      {!isReady ? (
        <SectionCard title="Loading records" description="The archive is being prepared.">
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="soft-panel h-52 animate-pulse" />
            ))}
          </div>
        </SectionCard>
      ) : filteredRecords.length === 0 ? (
        <SectionCard title={emptyTitle} description={emptyDescription}>
          <div className="soft-panel px-5 py-5 text-sm leading-7 text-stone-600">
            No records matched the current filter set. Try removing one or two filters.
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRecords.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function collectMonthOptions(records: Array<{ eventDate?: string; createdAt: string }>) {
  return [...new Set(records.map((record) => (record.eventDate ?? record.createdAt).slice(0, 7)))];
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}>) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-stone-500">
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
