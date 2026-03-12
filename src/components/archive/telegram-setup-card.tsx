"use client";

import { useState, useTransition } from "react";

type VerificationResponse = {
  ok: boolean;
  token: string;
  deepLink: string;
};

export function TelegramSetupCard({
  isConfigured,
}: Readonly<{
  isConfigured: boolean;
}>) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [deepLink, setDeepLink] = useState("");

  function createLink() {
    startTransition(async () => {
      setMessage("");

      try {
        const response = await fetch("/api/telegram/verify", {
          method: "POST",
        });

        const data = (await response.json()) as VerificationResponse | { error?: string };

        if (!response.ok || !("ok" in data) || !data.ok) {
          throw new Error("error" in data ? data.error : "verification_failed");
        }

        setToken(data.token);
        setDeepLink(data.deepLink);
        setMessage("연결 링크를 만들었습니다. Telegram에서 링크를 열어 본인 계정을 연결해 주세요.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Telegram 연결 링크 생성에 실패했습니다.");
      }
    });
  }

  if (!isConfigured) {
    return (
      <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-6 text-stone-600">
        `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` 환경 변수를 먼저 설정해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={createLink}
        disabled={isPending}
        className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white disabled:opacity-60"
      >
        {isPending ? "연결 링크 생성 중..." : "Telegram 연결 링크 만들기"}
      </button>

      {message ? <p className="text-sm leading-6 text-stone-600">{message}</p> : null}

      {token ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm leading-7 text-stone-700">
          <p>연결 코드: <span className="font-medium">{token}</span></p>
          {deepLink ? (
            <p className="mt-2 break-all">
              연결 링크:{" "}
              <a href={deepLink} target="_blank" rel="noreferrer" className="text-stone-900 underline underline-offset-4">
                {deepLink}
              </a>
            </p>
          ) : (
            <p className="mt-2">Telegram bot에서 `/start link_{token}` 을 직접 보내도 됩니다.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
