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
        title="삶의 기록을 다시 연결하는 개인 아카이브"
        description="창세록은 생각, 단어, 장소, 콘텐츠, 활동을 한 흐름 안에서 저장하고 다시 꺼내 읽기 위한 private archive입니다."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Records"
          value={`${records.length}개`}
          note="생각, 단어, 콘텐츠, 장소, 활동 기록을 한 곳에서 관리합니다."
        />
        <StatCard label="This Month" value={`${thisMonthCount}개`} note="이번 달에 남긴 기록 수" />
        <StatCard
          label="High Rated"
          value={`${highRated.length}개`}
          note="4.5 이상으로 표시된 기억할 만한 항목"
        />
        <StatCard
          label="Revisit"
          value={`${revisitCount}개`}
          note="다시 보고 싶거나 다시 가고 싶은 기록"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="최근 저장된 기록"
          description="가장 최근에 저장되거나 다시 정리된 기록부터 빠르게 훑어봅니다."
          action={<InlineLink href="/recent" label="전체 보기" />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {recentRecords.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="카테고리 개요" description="기록 축별로 빠르게 이동할 수 있습니다.">
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
                  <p className="mt-2 font-display text-2xl text-stone-950">{count}개</p>
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
          description="아이디어, 메모, 리플렉션을 다시 읽으며 패턴을 발견합니다."
          action={<InlineLink href="/thoughts" label="생각으로 이동" />}
        >
          <div className="space-y-4">
            {recentThoughts.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="고평점 기록"
          description="다시 보고 싶은 콘텐츠와 다시 가고 싶은 장소를 모아 봅니다."
          action={<InlineLink href="/review" label="리뷰 보기" />}
        >
          <div className="space-y-4">
            {highRated.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
        <SectionCard title="최근 장소" description="좋아하는 장소와 공간의 기억을 다시 확인합니다.">
          <div className="space-y-4">
            {recentPlaces.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="최근 활동" description="운동과 트래킹 기록을 몸의 감각과 함께 봅니다.">
          <div className="space-y-4">
            {recentActivities.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="자주 남긴 태그" description="반복되는 관심사와 흐름을 빠르게 읽습니다.">
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm"
              >
                #{tag} <span className="text-stone-400">· {count}</span>
              </span>
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
