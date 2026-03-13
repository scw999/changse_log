import { RecordExplorer } from "@/components/archive/record-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { CATEGORY_META } from "@/lib/archive/config";
import { CategoryKey } from "@/lib/archive/types";

interface CategoryPageProps {
  category: CategoryKey;
  eyebrow: string;
  title: string;
  description: string;
  initialTag?: string;
  initialQuery?: string;
}

export function CategoryPage({
  category,
  eyebrow,
  title,
  description,
  initialTag,
  initialQuery,
}: Readonly<CategoryPageProps>) {
  const meta = CATEGORY_META[category];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        <div className={`rounded-[28px] border px-4 py-4 ${meta.panelClass}`}>
          <p className="text-sm leading-6 text-stone-700">{meta.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.subcategories.map((subcategory) => (
              <span
                key={subcategory}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs text-stone-600"
              >
                {subcategory}
              </span>
            ))}
          </div>
        </div>
      </PageHeader>

      <RecordExplorer
        category={category}
        initialTag={initialTag}
        initialQuery={initialQuery}
        emptyTitle={`${meta.label} 기록이 아직 없습니다`}
        emptyDescription={`${meta.label} 기록이 쌓이면 여기에서 필터와 검색으로 빠르게 다시 볼 수 있습니다.`}
      />
    </div>
  );
}
