import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ next?: string; error?: string }>;
}>) {
  const { next, error } = await searchParams;
  const nextPath = next || "/admin";
  const errorMessage = getLoginErrorMessage(error);

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
        title="개인 아카이브 관리자 로그인"
        description="관리자 편집과 이미지 업로드는 허용된 본인 이메일로 로그인한 경우에만 사용할 수 있습니다. 이메일 매직 링크로 간단하게 로그인해 주세요."
      />

      <SectionCard title="로그인" description="매직 링크를 받을 이메일 주소를 입력해 주세요.">
        {errorMessage ? (
          <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        {isSupabaseConfigured() ? (
          <LoginForm nextPath={nextPath} />
        ) : (
          <div className="soft-panel px-4 py-4 text-sm leading-7 text-stone-600">
            Supabase 환경 변수가 아직 연결되지 않았습니다. `.env.local`과 배포 환경 변수에 값을 설정해 주세요.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function getLoginErrorMessage(error?: string) {
  switch (error) {
    case "otp_expired":
    case "access_denied":
      return "로그인 링크가 만료되었거나 이미 사용되었습니다. 로그인 페이지에서 새 매직 링크를 다시 받아 주세요.";
    case "missing_code":
      return "유효한 로그인 정보가 확인되지 않았습니다. 로그인 페이지에서 다시 시도해 주세요.";
    case "callback_failed":
    case "server_error":
      return "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return error ? "로그인을 완료하지 못했습니다. 새 매직 링크로 다시 시도해 주세요." : "";
  }
}
