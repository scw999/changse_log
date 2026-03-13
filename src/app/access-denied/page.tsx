import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { allowedViewerEmails } from "@/lib/supabase/env";

export default function AccessDeniedPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Private Access"
        title="이 계정은 접근이 허용되지 않았습니다"
        description="창세록은 초대된 이메일 사용자만 볼 수 있는 private archive입니다."
      />

      <SectionCard
        title="접근 가능한 이메일"
        description="허용된 이메일로 다시 로그인하거나, 환경 변수 allowlist에 주소를 추가해 주세요."
      >
        {allowedViewerEmails.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {allowedViewerEmails.map((email) => (
              <span
                key={email}
                className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs text-stone-600"
              >
                {email}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?error=access_denied&next=/"
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
