import { RecordDetailView } from "@/components/archive/record-detail-view";

export default async function RecordDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return <RecordDetailView id={id} />;
}
