import { TagsPageView } from "@/components/archive/tags-page-view";
import { CategoryKey } from "@/lib/archive/types";

function isCategoryKey(value?: string): value is CategoryKey {
  return (
    value === "thoughts" ||
    value === "words" ||
    value === "content" ||
    value === "places" ||
    value === "activities"
  );
}

export default async function TagsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ category?: string }>;
}>) {
  const { category } = await searchParams;

  return <TagsPageView category={isCategoryKey(category) ? category : undefined} />;
}
