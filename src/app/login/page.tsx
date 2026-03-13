import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { allowedViewerEmails, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ next?: string; error?: string }>;
}>) {
  const { next, error } = await searchParams;
  const nextPath = next || "/";
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
        title="초대된 사용자만 접근할 수 있습니다"
        description="창세록은 private archive입니다. 허용된 이메일 주소로 로그인한 사용자만 기록을 볼 수 있습니다."
      />

      <SectionCard title="로그인" description="매직 링크를 받을 이메일 주소를 입력해 주세요.">
        {errorMessage ? (
          <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        {allowedViewerEmails.length > 0 ? (
          <div className="mb-4 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-7 text-stone-700">
            허용된 이메일:
            <div className="mt-2 flex flex-wrap gap-2">
              {allowedViewerEmails.map((email) => (
                <span
                  key={email}
                  className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs text-stone-600"
                >
                  {email}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {isSupabaseConfigured() ? (
          <LoginForm nextPath={nextPath} />
        ) : (
          <div className="soft-panel px-4 py-4 text-sm leading-7 text-stone-600">
            Supabase 환경 변수가 아직 연결되지 않았습니다. `.env.local` 또는 Vercel 환경 변수에서 값을 설정해 주세요.
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
      return "로그인 링크가 만료되었거나 이미 사용되었습니다. 로그인 페이지에서 새 링크를 다시 받아 주세요.";
    case "missing_code":
      return "유효한 로그인 정보가 확인되지 않았습니다. 다시 시도해 주세요.";
    case "callback_failed":
    case "server_error":
      return "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return error ? "로그인을 완료하지 못했습니다. 새 매직 링크로 다시 시도해 주세요." : "";
  }
}
