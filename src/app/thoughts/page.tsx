import { CategoryPage } from "@/components/archive/category-page";

export default async function ThoughtsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tag?: string; q?: string }>;
}>) {
  const { tag, q } = await searchParams;

  return (
    <CategoryPage
      category="thoughts"
      eyebrow="Thought Archive"
      title="생각, 아이디어, 메모를 다시 펼쳐보는 공간"
      description="짧은 메모부터 리플렉션까지, 남겨둔 생각 기록을 다시 읽고 연결할 수 있도록 모아둔 아카이브입니다."
      initialTag={tag}
      initialQuery={q}
    />
  );
}
