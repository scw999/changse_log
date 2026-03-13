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
        title="Revisit recent records with better filtering"
        description="Search across your latest archive entries, then narrow them down by tag, month, rating, importance, and revisit intent."
      />
      <RecordExplorer
        key={`${tag ?? "all"}:${q ?? ""}:${month ?? "all"}:${ratingMin ?? "all"}:${revisitOnly ?? "false"}`}
        initialTag={tag}
        initialQuery={q}
        initialMonth={month}
        initialRatingMin={initialRatingMin}
        initialRevisitOnly={revisitOnly === "true"}
        emptyTitle="No records match this filter"
        emptyDescription="Try widening the current filters or searching with a broader keyword."
      />
    </div>
  );
}
