"use client";

import Link from "next/link";

import { RecordCard } from "@/components/archive/record-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/archive/config";
import { useArchive } from "@/lib/archive/context";
import { getRecordRating, getRecordRevisitIntent } from "@/lib/archive/utils";

export function DashboardView() {
  const { records } = useArchive();

  const recentRecords = records.slice(0, 4);
  const recentThoughts = records.filter((record) => record.category === "thoughts").slice(0, 3);
  const recentPlaces = records.filter((record) => record.category === "places").slice(0, 2);
  const recentActivities = records.filter((record) => record.category === "activities").slice(0, 2);
  const highRated = records.filter((record) => (getRecordRating(record) ?? 0) >= 4.5).slice(0, 4);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = records.filter((record) =>
    (record.eventDate ?? record.createdAt).startsWith(currentMonth),
  ).length;

  const revisitCount = records.filter((record) => getRecordRevisitIntent(record) === "yes").length;

  const tagCounts = new Map<string, number>();
  for (const record of records) {
    for (const tag of record.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personal Archive Dashboard"
        title="개인 아카이브를 더 빠르게 살펴보는 대시보드"
        description="생각, 단어, 콘텐츠, 장소, 활동 기록을 한곳에서 보고, 원하는 묶음으로 바로 이동해 다시 살펴볼 수 있습니다."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 기록"
          value={`${records.length}`}
          note="전체 기록 목록으로 이동합니다."
          href="/recent"
        />
        <StatCard
          label="이번 달"
          value={`${thisMonthCount}`}
          note="이번 달에 남긴 기록만 바로 봅니다."
          href={`/recent?month=${currentMonth}`}
        />
        <StatCard
          label="고평점"
          value={`${highRated.length}`}
          note="평점 4.5 이상 기록으로 이동합니다."
          href="/recent?ratingMin=4.5"
        />
        <StatCard
          label="다시 보기"
          value={`${revisitCount}`}
          note="다시 보고 싶은 기록만 모아 봅니다."
          href="/recent?revisitOnly=true"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="최근 추가한 기록"
          description="가장 최근에 저장한 기록을 빠르게 다시 볼 수 있습니다."
          action={<InlineLink href="/recent" label="전체 보기" />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {recentRecords.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="카테고리" description="원하는 기록 묶음으로 바로 이동합니다.">
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const count = records.filter((record) => record.category === category).length;

              return (
                <Link
                  key={category}
                  href={meta.route}
                  className={`rounded-[24px] border px-4 py-4 transition hover:-translate-y-0.5 ${meta.panelClass}`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{meta.label}</p>
                  <p className="mt-2 font-display text-2xl text-stone-950">{count}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{meta.description}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="최근 생각"
          description="다시 펼쳐보고 싶은 아이디어와 메모, 리플렉션입니다."
          action={<InlineLink href="/thoughts" label="생각 보기" />}
        >
          <div className="space-y-4">
            {recentThoughts.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="고평점 기록"
          description="좋게 남겨둔 콘텐츠, 장소, 활동을 한 번에 모아봅니다."
          action={<InlineLink href="/recent?ratingMin=4.5" label="필터 목록 보기" />}
        >
          <div className="space-y-4">
            {highRated.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
        <SectionCard title="최근 장소" description="기억해두고 싶은 장소 기록입니다.">
          <div className="space-y-4">
            {recentPlaces.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="최근 활동" description="이동, 운동, 루틴 기록을 한눈에 봅니다.">
          <div className="space-y-4">
            {recentActivities.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="자주 쓴 태그" description="관련 기록 묶음으로 빠르게 이동합니다.">
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <Link
                key={tag}
                href={`/recent?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm"
              >
                #{tag} <span className="text-stone-400">· {count}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function InlineLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      className="rounded-full border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-700 transition hover:bg-white"
    >
      {label}
    </Link>
  );
}
