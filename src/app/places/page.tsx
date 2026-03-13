import { CategoryPage } from "@/components/archive/category-page";

export default async function PlacesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tag?: string; q?: string }>;
}>) {
  const { tag, q } = await searchParams;

  return (
    <CategoryPage
      category="places"
      eyebrow="Place Archive"
      title="좋아했던 식당과 카페, 장소를 다시 꺼내보는 기록"
      description="지역, 분위기, 동행, 가격 메모와 함께 장소 취향을 차곡차곡 쌓아갑니다."
      initialTag={tag}
      initialQuery={q}
    />
  );
}
