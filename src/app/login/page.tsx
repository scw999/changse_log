import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ next?: string }>;
}>) {
  const { next } = await searchParams;
  const nextPath = next || "/admin";

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(nextPath);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Private Access"
        title="개인 아카이브에 로그인"
        description="관리자 편집기와 이미지 업로드는 로그인한 본인만 사용할 수 있습니다. 이메일 매직 링크로 간단히 로그인하세요."
      />

      <SectionCard title="로그인" description="로그인 링크는 입력한 이메일 주소로 전송됩니다.">
        {isSupabaseConfigured() ? (
          <LoginForm nextPath={nextPath} />
        ) : (
          <div className="soft-panel px-4 py-4 text-sm leading-7 text-stone-600">
            Supabase 환경 변수가 아직 연결되지 않았습니다. `.env.local`과 배포 환경 변수부터 설정해 주세요.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
