import { notFound } from "next/navigation";

import { RecordDetailView } from "@/components/archive/record-detail-view";
import { getServerArchiveRecordDetail } from "@/lib/archive/server-records";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export default async function RecordDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  if (!isSupabaseAdminConfigured()) {
    return <RecordDetailView id={id} />;
  }

  const initialRecord = await getServerArchiveRecordDetail(id);

  if (!initialRecord) {
    notFound();
  }

  return <RecordDetailView id={id} initialRecord={initialRecord} />;
}
