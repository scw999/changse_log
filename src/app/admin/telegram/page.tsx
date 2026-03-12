import Link from "next/link";

import { TelegramSetupCard } from "@/components/archive/telegram-setup-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireAdminUser } from "@/lib/supabase/access";
import { isTelegramConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminTelegramPage() {
  const user = await requireAdminUser("/admin/telegram");

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: identity }, { data: inboxMessages }, { data: draftRecords }] = await Promise.all([
    supabase
      .from("telegram_identities")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("inbox_messages")
      .select("id, raw_text, status, received_at, processed_at")
      .eq("owner_id", user.id)
      .order("received_at", { ascending: false })
      .limit(8),
    supabase
      .from("draft_records")
      .select("id, title, category, status, summary, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin / Telegram"
        title="Telegram 수집 흐름"
        description="Telegram은 빠른 캡처와 승인에 집중하고, 창세록 웹앱은 최종 저장과 수정에 집중합니다. 이 화면에서는 계정 연결 상태와 최근 수집 흐름을 점검합니다."
      >
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-700"
        >
          기록 편집기로 돌아가기
        </Link>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Telegram 연결"
          description="관리자 본인 Telegram 계정만 창세록에 메모를 보낼 수 있도록 연결합니다."
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-4 py-4 text-sm leading-7 text-stone-700">
              <p>상태: <span className="font-medium">{identity?.status ?? "not_connected"}</span></p>
              <p>Telegram ID: <span className="font-medium">{identity?.telegram_user_id ?? "-"}</span></p>
              <p>Username: <span className="font-medium">{identity?.telegram_username ?? "-"}</span></p>
              <p>마지막 확인: <span className="font-medium">{identity?.last_seen_at ?? "-"}</span></p>
            </div>

            <TelegramSetupCard isConfigured={isTelegramConfigured()} />
          </div>
        </SectionCard>

        <SectionCard
          title="운영 메모"
          description="Webhook과 승인 버튼은 서버 전용으로 처리되고, 허용된 Telegram 계정만 inbox/draft를 만들 수 있습니다."
        >
          <div className="space-y-3 text-sm leading-7 text-stone-600">
            <p>1. 관리자 화면에서 연결 링크를 생성합니다.</p>
            <p>2. Telegram에서 링크를 열거나 `/start link_토큰`을 보냅니다.</p>
            <p>3. 이후 메모를 보내면 raw inbox 저장, draft 생성, 승인 버튼 전송 순서로 진행됩니다.</p>
            <p>4. 승인된 기록만 창세록 메인 아카이브에 저장됩니다.</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="최근 Inbox"
          description="Telegram에서 받은 원문 메모 흐름입니다."
        >
          <div className="space-y-3">
            {(inboxMessages ?? []).length > 0 ? (
              inboxMessages?.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-stone-100 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{item.status}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-800">{item.raw_text}</p>
                  <p className="mt-2 text-xs text-stone-500">{item.received_at}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-sm text-stone-500">
                아직 Telegram inbox 메시지가 없습니다.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="최근 Draft"
          description="승인 대기 또는 반려된 Telegram 초안 기록입니다."
        >
          <div className="space-y-3">
            {(draftRecords ?? []).length > 0 ? (
              draftRecords?.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-stone-100 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{item.status}</p>
                  <p className="mt-2 text-base text-stone-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{item.summary}</p>
                  <p className="mt-2 text-xs text-stone-500">{item.category} · {item.created_at}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-sm text-stone-500">
                아직 생성된 Telegram draft가 없습니다.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
