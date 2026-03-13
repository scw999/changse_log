import { CategoryPage } from "@/components/archive/category-page";

export default async function ContentPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tag?: string; q?: string }>;
}>) {
  const { tag, q } = await searchParams;

  return (
    <CategoryPage
      category="content"
      eyebrow="Content Archive"
      title="영화, 책, 드라마, 영상 감상을 다시 돌아보는 공간"
      description="평점, 한 줄 리뷰, 기억에 남는 포인트를 함께 보며 오래 남은 콘텐츠를 다시 발견할 수 있습니다."
      initialTag={tag}
      initialQuery={q}
    />
  );
}
