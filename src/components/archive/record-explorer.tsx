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
}

export function RecordExplorer({
  category,
  emptyTitle,
  emptyDescription,
  initialTag,
  initialQuery,
}: Readonly<RecordExplorerProps>) {
  const { records, isReady } = useArchive();
  const [filters, setFilters] = useState<RecordFilterState>(() => ({
    ...DEFAULT_FILTERS,
    tag: initialTag && initialTag.trim().length > 0 ? initialTag : "all",
    search: initialQuery && initialQuery.trim().length > 0 ? initialQuery : "",
  }));

  const deferredSearch = useDeferredValue(filters.search);
  const scopedRecords = category ? records.filter((record) => record.category === category) : records;
  const options = collectFilterOptions(scopedRecords);
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
        title="탐색과 필터"
        description="검색, 정렬, 평점, 지역, 태그 조건으로 기록을 빠르게 좁혀보세요."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-stone-500">
              Search
            </span>
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="제목, 본문, 요약, 태그, 장소, 단어 검색"
              className="field"
            />
          </label>

          <SelectField
            label="정렬"
            value={filters.sort}
            onChange={(value) => updateFilter("sort", value as RecordFilterState["sort"])}
            options={[
              { value: "newest", label: "최신순" },
              { value: "oldest", label: "오래된순" },
              { value: "rating", label: "평점순" },
              { value: "importance", label: "중요도순" },
            ]}
          />

          <SelectField
            label="유형"
            value={filters.subcategory}
            onChange={(value) => updateFilter("subcategory", value)}
            options={[
              { value: "all", label: "전체 유형" },
              ...options.subcategories.map((subcategory) => ({
                value: subcategory,
                label: subcategory,
              })),
            ]}
          />

          <SelectField
            label="태그"
            value={filters.tag}
            onChange={(value) => updateFilter("tag", value)}
            options={[
              { value: "all", label: "전체 태그" },
              ...options.tags.map((tag) => ({
                value: tag,
                label: `#${tag}`,
              })),
            ]}
          />

          <SelectField
            label="중요도"
            value={filters.importanceMin === null ? "all" : String(filters.importanceMin)}
            onChange={(value) =>
              updateFilter("importanceMin", value === "all" ? null : Number(value))
            }
            options={[
              { value: "all", label: "전체 중요도" },
              { value: "3", label: "3 이상" },
              { value: "4", label: "4 이상" },
              { value: "5", label: "5만" },
            ]}
          />

          {options.areas.length > 0 ? (
            <SelectField
              label="지역"
              value={filters.area}
              onChange={(value) => updateFilter("area", value)}
              options={[
                { value: "all", label: "전체 지역" },
                ...options.areas.map((area) => ({ value: area, label: area })),
              ]}
            />
          ) : null}

          {ratedCount > 0 ? (
            <SelectField
              label="평점"
              value={filters.ratingMin === null ? "all" : String(filters.ratingMin)}
              onChange={(value) =>
                updateFilter("ratingMin", value === "all" ? null : Number(value))
              }
              options={[
                { value: "all", label: "전체 평점" },
                { value: "3.5", label: "3.5 이상" },
                { value: "4", label: "4.0 이상" },
                { value: "4.5", label: "4.5 이상" },
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
          다시 보고 싶거나 다시 가고 싶은 기록만 보기
        </label>

        {filters.search !== deferredSearch ? (
          <p className="mt-3 text-xs text-stone-500">검색 결과를 정리 중입니다...</p>
        ) : null}
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Visible Records"
          value={`${filteredRecords.length}개`}
          note={`${scopedRecords.length}개 기록 중 현재 조건에 맞는 결과`}
        />
        <StatCard
          label="High Rated"
          value={`${highRatedCount}개`}
          note="4.5 이상으로 남긴 기록"
        />
        <StatCard
          label="Revisit"
          value={`${revisitCount}개`}
          note="다시 보고 싶거나 다시 가고 싶은 기록"
        />
        <StatCard
          label="Tags"
          value={`${options.tags.length}개`}
          note="현재 범위에서 탐색 가능한 태그 수"
        />
      </div>

      {!isReady ? (
        <SectionCard title="불러오는 중" description="기록을 정리해서 보여주고 있습니다.">
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="soft-panel h-52 animate-pulse" />
            ))}
          </div>
        </SectionCard>
      ) : filteredRecords.length === 0 ? (
        <SectionCard title={emptyTitle} description={emptyDescription}>
          <div className="soft-panel px-5 py-5 text-sm leading-7 text-stone-600">
            현재 조건에서 일치하는 기록이 없습니다. 검색어나 필터를 조금 완화해 보세요.
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
