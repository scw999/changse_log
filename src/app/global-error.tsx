"use client";

import { useEffect, useMemo } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const safeMessage = useMemo(() => {
    const message = typeof error?.message === "string" ? error.message.trim() : "";
    return message || "unknown_global_error";
  }, [error]);

  const safeStack = useMemo(() => {
    if (typeof error?.stack !== "string") {
      return [] as string[];
    }

    return error.stack
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [error]);

  useEffect(() => {
    console.error("[global-error] application crashed", {
      message: safeMessage,
      digest: error?.digest,
      stack: safeStack,
    });
  }, [error?.digest, safeMessage, safeStack]);

  return (
    <html lang="ko">
      <body className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4 rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-600">Global error</p>
            <h1 className="mt-2 text-2xl font-semibold">앱 전역 오류가 발생했습니다</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              generic client-side exception 대신, 실제 오류 메시지와 재시도 버튼을 바로 표시합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.28em] text-rose-700">Message</p>
            <p className="mt-2 break-all font-medium text-rose-950">{safeMessage}</p>
            {error?.digest ? <p className="mt-2 text-xs text-rose-700">digest: {error.digest}</p> : null}
          </div>

          {safeStack.length > 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Stack</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-stone-700">
                {safeStack.join("\n")}
              </pre>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
            >
              다시 시도
            </button>
            <a
              href="/recent"
              className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
            >
              최근 기록으로
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
