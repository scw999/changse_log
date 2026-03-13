import { RecordExplorer } from "@/components/archive/record-explorer";
import { PageHeader } from "@/components/ui/page-header";

export default async function RecentPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    tag?: string;
    q?: string;
    month?: string;
    ratingMin?: string;
    revisitOnly?: string;
  }>;
}>) {
  const { tag, q, month, ratingMin, revisitOnly } = await searchParams;
  const parsedRatingMin = ratingMin ? Number(ratingMin) : null;
  const initialRatingMin = Number.isFinite(parsedRatingMin) ? parsedRatingMin : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inbox / Recent"
        title="최근 기록을 더 세밀하게 다시 살펴보기"
        description="최신 아카이브 기록을 검색하고, 태그·월·평점·중요도·다시 보기 조건으로 빠르게 좁혀볼 수 있습니다."
      />
      <RecordExplorer
        key={`${tag ?? "all"}:${q ?? ""}:${month ?? "all"}:${ratingMin ?? "all"}:${revisitOnly ?? "false"}`}
        initialTag={tag}
        initialQuery={q}
        initialMonth={month}
        initialRatingMin={initialRatingMin}
        initialRevisitOnly={revisitOnly === "true"}
        emptyTitle="조건에 맞는 기록이 없습니다"
        emptyDescription="필터를 조금 완화하거나 더 넓은 검색어로 다시 찾아보세요."
      />
    </div>
  );
}
