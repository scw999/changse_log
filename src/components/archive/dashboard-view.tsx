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
        title="A faster view into your personal archive"
        description="Track thoughts, words, content, places, and activities in one place, then jump directly into the slice you want to review."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Records"
          value={`${records.length}`}
          note="Open the full archive list."
          href="/recent"
        />
        <StatCard
          label="This Month"
          value={`${thisMonthCount}`}
          note="Jump to records created this month."
          href={`/recent?month=${currentMonth}`}
        />
        <StatCard
          label="High Rated"
          value={`${highRated.length}`}
          note="Open records rated 4.5 or higher."
          href="/recent?ratingMin=4.5"
        />
        <StatCard
          label="Revisit"
          value={`${revisitCount}`}
          note="See the records worth revisiting."
          href="/recent?revisitOnly=true"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Recently added"
          description="Pick up the latest entries quickly."
          action={<InlineLink href="/recent" label="See all recent" />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {recentRecords.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Categories" description="Move into a focused archive area right away.">
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
          title="Recent thoughts"
          description="Ideas, notes, and reflections worth reopening."
          action={<InlineLink href="/thoughts" label="Open thoughts" />}
        >
          <div className="space-y-4">
            {recentThoughts.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Highly rated"
          description="Your strongest content, places, or activities in one view."
          action={<InlineLink href="/recent?ratingMin=4.5" label="Open filtered list" />}
        >
          <div className="space-y-4">
            {highRated.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
        <SectionCard title="Recent places" description="Places that stood out enough to save.">
          <div className="space-y-4">
            {recentPlaces.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent activities" description="Movement, workouts, and routines at a glance.">
          <div className="space-y-4">
            {recentActivities.map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top tags" description="Jump into clusters of related records.">
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <Link
                key={tag}
                href={`/recent?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm"
              >
                #{tag} <span className="text-stone-400">x {count}</span>
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
