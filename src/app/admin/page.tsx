import Link from "next/link";

import { AdminEditor } from "@/components/archive/admin-editor";
import { SectionCard } from "@/components/ui/section-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdminUser } from "@/lib/supabase/access";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return <AdminEditor />;
  }

  await requireAdminUser("/admin");

  return (
    <div className="space-y-5">
      <SectionCard
        title="Ingestion"
        description="Telegram rough note 수집 흐름과 연결 상태는 별도 화면에서 관리합니다."
        action={
          <Link
            href="/admin/telegram"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-700"
          >
            Telegram 관리
          </Link>
        }
      >
        <p className="text-sm leading-7 text-stone-600">
          Telegram은 메모 캡처와 승인에 집중하고, 이 편집기는 최종 기록 수정과 이미지 보강에 집중합니다.
        </p>
      </SectionCard>

      <AdminEditor />
    </div>
  );
}
