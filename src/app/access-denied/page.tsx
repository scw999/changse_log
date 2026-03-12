import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { allowedAdminEmail, isAdminEmailConfigured } from "@/lib/supabase/env";

export default function AccessDeniedPage() {
  const description = isAdminEmailConfigured()
    ? `이 앱은 개인 관리자용으로 잠겨 있습니다. 허용된 이메일(${allowedAdminEmail})로 로그인한 경우에만 관리자 화면에 접근할 수 있습니다.`
    : "관리자 이메일이 아직 설정되지 않아 편집 화면 접근이 잠겨 있습니다. Vercel 또는 로컬 환경 변수에서 ALLOWED_ADMIN_EMAIL을 설정해 주세요.";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Private Access"
        title="접근이 허용되지 않았습니다"
        description={description}
      />

      <SectionCard
        title="다음에 확인할 것"
        description="허용된 이메일로 다시 로그인하거나, 배포 환경 변수 설정을 점검해 주세요."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?error=access_denied&next=/admin"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm text-white"
          >
            다시 로그인
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-5 py-3 text-sm text-stone-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
