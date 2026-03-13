import { CategoryPage } from "@/components/archive/category-page";

export default async function ActivitiesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tag?: string; q?: string }>;
}>) {
  const { tag, q } = await searchParams;

  return (
    <CategoryPage
      category="activities"
      eyebrow="Activity Archive"
      title="이동과 운동, 활동 기록을 다시 읽는 공간"
      description="거리, 시간, 난이도, 만족도와 함께 활동 흐름을 다시 살펴볼 수 있습니다."
      initialTag={tag}
      initialQuery={q}
    />
  );
}
