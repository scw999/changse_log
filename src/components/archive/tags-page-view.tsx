"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { CATEGORY_META } from "@/lib/archive/config";
import { useArchive } from "@/lib/archive/context";
import { CategoryKey } from "@/lib/archive/types";

export function TagsPageView({ category }: Readonly<{ category?: CategoryKey }>) {
  const { records } = useArchive();
  const scopedRecords = category ? records.filter((record) => record.category === category) : records;
  const tagCounts = collectTagCounts(scopedRecords);
  const meta = category ? CATEGORY_META[category] : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={meta ? `${meta.label} Tags` : "Archive Tags"}
        title={meta ? `${meta.label} 태그 모아보기` : "전체 태그 모아보기"}
        description={
          meta
            ? `${meta.label} 기록에 사용한 태그를 따로 모았습니다. 태그를 누르면 해당 기록 목록으로 이동합니다.`
            : "아카이브 전체에서 사용한 태그를 따로 모았습니다. 태그를 누르면 해당 기록 목록으로 이동합니다."
        }
      />

      <SectionCard
        title="태그 목록"
        description={meta ? `${meta.label} 기록에 사용한 태그 ${tagCounts.length}개` : `전체 태그 ${tagCounts.length}개`}
      >
        {tagCounts.length === 0 ? (
          <div className="soft-panel px-5 py-5 text-sm leading-7 text-stone-600">
            아직 표시할 태그가 없습니다.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count]) => (
              <Link
                key={tag}
                href={buildTagTarget(tag, category)}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                #{tag} <span className="text-stone-400">· {count}</span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function collectTagCounts(records: Array<{ tags: string[] }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    for (const tag of record.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0], "ko");
  });
}

function buildTagTarget(tag: string, category?: CategoryKey) {
  if (!category) {
    return `/recent?tag=${encodeURIComponent(tag)}`;
  }

  return `${CATEGORY_META[category].route}?tag=${encodeURIComponent(tag)}`;
}
