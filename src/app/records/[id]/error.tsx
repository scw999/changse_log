"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

export default function RecordDetailError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const safeMessage = useMemo(() => {
    const message = typeof error?.message === "string" ? error.message.trim() : "";
    return message || "unknown_record_detail_error";
  }, [error]);

  const safeStack = useMemo(() => {
    if (typeof error?.stack !== "string") {
      return [] as string[];
    }

    return error.stack
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [error]);

  useEffect(() => {
    console.error("[records/:id] render failed", {
      message: safeMessage,
      digest: error?.digest,
      stack: safeStack,
    });
  }, [error?.digest, safeMessage, safeStack]);

  return (
    <SectionCard
      title="상세 페이지 렌더 오류"
      description="generic client-side exception 대신 실제 원인 힌트를 바로 볼 수 있게 표시합니다."
    >
      <div className="space-y-4 text-sm text-stone-700">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-700">Error</p>
          <p className="mt-2 break-all font-medium text-amber-900">{safeMessage}</p>
          {error?.digest ? (
            <p className="mt-2 text-xs text-amber-800">digest: {error.digest}</p>
          ) : null}
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
          <Link
            href="/recent"
            className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
          >
            최근 기록으로
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}
