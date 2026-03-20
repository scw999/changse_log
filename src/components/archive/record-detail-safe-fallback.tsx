import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { ArchiveRecord } from "@/lib/archive/types";
import { formatDate, getSourceLabel } from "@/lib/archive/utils";

export function RecordDetailSafeFallback({
  id,
  record,
  reason,
}: Readonly<{
  id: string;
  record: ArchiveRecord | null;
  reason?: string;
}>) {
  const title = toDisplayText(record?.title, "제목 없음");
  const summary = toDisplayText(record?.summary, "요약 없음");
  const body = getReadableBody(record?.body);
  const notes = toDisplayText(record?.notes);
  const tags = Array.isArray(record?.tags) ? record.tags.filter(Boolean) : [];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Safe mode 상세"
        description="상세 UI가 깨져도 이 카드에서 최소 텍스트 내용을 계속 확인할 수 있습니다."
      >
        <div className="space-y-4 text-sm text-stone-700">
          {reason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-700">Fallback reason</p>
              <p className="mt-2 break-all">{reason}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="제목" value={title} />
            <Info label="날짜" value={record ? formatDate(record.eventDate ?? record.createdAt) : "-"} />
            <Info label="카테고리" value={record?.subcategory || record?.category || "기타"} />
            <Info label="저장 경로" value={record ? getSourceLabel(record) : "-"} />
          </div>

          <div className="rounded-[24px] border border-stone-100 bg-stone-50/80 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Summary</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-800">{summary}</p>
          </div>

          <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Body</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-800">
              {body || "이 기록에 저장된 본문이 없습니다."}
            </p>
          </div>

          {notes ? (
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Notes</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-800">{notes}</p>
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/records/${id}?safe=1`}
              className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
            >
              safe mode로 다시 열기
            </Link>
            <Link
              href="/recent"
              className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
            >
              최근 기록으로
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-800">{value}</p>
    </div>
  );
}

function toDisplayText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function isHtmlDocument(value?: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
}

function getReadableBody(value?: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  if (!isHtmlDocument(value)) {
    return value.trim();
  }

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
