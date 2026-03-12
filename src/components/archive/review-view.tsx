"use client";

import { RecordCard } from "@/components/archive/record-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { useArchive } from "@/lib/archive/context";
import { groupRecordsByMonth, getRecordRating } from "@/lib/archive/utils";

export function ReviewView() {
  const { records } = useArchive();

  const favoriteRecords = records
    .filter((record) => (getRecordRating(record) ?? 0) >= 4.5 || record.thought?.worthRevisiting)
    .slice(0, 6);

  const contentCandidates = records
    .filter((record) => record.category === "content" && record.content?.revisitIntent === "yes")
    .slice(0, 4);

  const placeCandidates = records
    .filter((record) => record.category === "places" && record.place?.revisitIntent === "yes")
    .slice(0, 4);

  const thoughtCandidates = records
    .filter((record) => record.category === "thoughts" && record.thought?.worthRevisiting)
    .slice(0, 4);

  const timeline = groupRecordsByMonth(records).slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Review & Reflection"
        title="기록을 다시 읽고 패턴을 발견하는 회고 화면"
        description="고평점 장소와 콘텐츠, 다시 보고 싶은 생각, 월별 타임라인을 한곳에서 확인하며 개인적인 취향과 흐름을 되짚습니다."
      >
        <div className="rounded-[28px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Reflection Focus</p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            감상 요약보다 반복되는 장소, 점수, 태그, 다시 보고 싶은 대상을 쉽게 발견하도록 구성했습니다.
          </p>
        </div>
      </PageHeader>

      <SectionCard
        title="지금 다시 펼쳐볼 가치가 큰 기록"
        description="평점과 재방문 의도, 다시 읽을 가치가 높은 생각들을 먼저 모았습니다."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {favoriteRecords.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="다시 볼 콘텐츠" description="재감상 의사가 있는 영화, 책, 드라마, 영상">
          <div className="space-y-4">
            {contentCandidates.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="다시 가고 싶은 장소" description="재방문 의사가 높은 식당, 카페, 여행지">
          <div className="space-y-4">
            {placeCandidates.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="다시 읽을 생각" description="지금의 방향과 취향을 다시 잡아주는 메모">
          <div className="space-y-4">
            {thoughtCandidates.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="월별 타임라인" description="월 단위로 남긴 기록 흐름을 다시 읽습니다.">
        <div className="space-y-4">
          {timeline.map((group) => (
            <div key={group.month} className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{group.month}</p>
              <div className="mt-4 space-y-3">
                {group.items.slice(0, 4).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{record.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{record.summary}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-stone-500">
                      {record.subcategory}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
