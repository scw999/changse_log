import { notFound } from "next/navigation";

import { RecordDetailRuntimeGuard } from "@/components/archive/record-detail-runtime-guard";
import { RecordDetailSafeFallback } from "@/components/archive/record-detail-safe-fallback";
import { RecordDetailView } from "@/components/archive/record-detail-view";
import { getServerArchiveRecordDetail } from "@/lib/archive/server-records";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

// Signed image URLs expire — never cache this page.
export const dynamic = "force-dynamic";

export default async function RecordDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ safe?: string }>;
}>) {
  const { id } = await params;
  const { safe } = await searchParams;
  const forceSafeMode = safe === "1" || safe === "true";

  if (!isSupabaseAdminConfigured()) {
    if (forceSafeMode) {
      return <RecordDetailSafeFallback id={id} record={null} reason="forced_safe_mode" />;
    }

    return (
      <RecordDetailRuntimeGuard id={id} record={null}>
        <RecordDetailView id={id} />
      </RecordDetailRuntimeGuard>
    );
  }

  const initialRecord = await getServerArchiveRecordDetail(id);

  if (!initialRecord) {
    notFound();
  }

  if (forceSafeMode) {
    return <RecordDetailSafeFallback id={id} record={initialRecord} reason="forced_safe_mode" />;
  }

  return (
    <RecordDetailRuntimeGuard id={id} record={initialRecord}>
      <RecordDetailView id={id} initialRecord={initialRecord} />
    </RecordDetailRuntimeGuard>
  );
}
