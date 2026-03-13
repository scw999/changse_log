import { CategoryPage } from "@/components/archive/category-page";

export default async function WordsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tag?: string; q?: string }>;
}>) {
  const { tag, q } = await searchParams;

  return (
    <CategoryPage
      category="words"
      eyebrow="Word Archive"
      title="꺼내 보고 싶은 단어와 표현의 개인 사전"
      description="의미, 표현, 예문, 기억해둔 문장을 다시 찾아보며 나만의 언어 취향을 쌓아갑니다."
      initialTag={tag}
      initialQuery={q}
    />
  );
}
