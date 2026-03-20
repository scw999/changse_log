"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  NotebookPen,
  Star,
  Tags,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionCard } from "@/components/ui/section-card";
import { useArchive } from "@/lib/archive/context";
import { ArchiveImage, ArchiveRecord } from "@/lib/archive/types";
import {
  formatDate,
  getImportanceLabel,
  getRecordArea,
  getRecordRating,
  getSourceLabel,
  normalizeImages,
} from "@/lib/archive/utils";

export function RecordDetailView({
  id,
  initialRecord = null,
}: Readonly<{ id: string; initialRecord?: ArchiveRecord | null }>) {
  const { records, isReady, getRecordDetail } = useArchive();
  const previewRecord = records.find((item) => item.id === id) ?? null;
  const [loadedRecord, setLoadedRecord] = useState<ArchiveRecord | null>(initialRecord);
  const record = loadedRecord ?? initialRecord ?? previewRecord;
  const images = useMemo(
    () => normalizeImages(record?.images ?? []).filter((img) => img.url),
    [record?.images],
  );
  const readableBody = useMemo(() => getReadableBody(record?.body), [record?.body]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!isReady || hasFullRecordDetail(record)) {
      return () => {
        ignore = true;
      };
    }

    void getRecordDetail(id)
      .then((detail) => {
        if (!ignore && detail) {
          setLoadedRecord(detail);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [getRecordDetail, id, isReady, record]);

  useEffect(() => {
    if (activeImageIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveImageIndex((current) =>
          current === null ? current : (current - 1 + images.length) % images.length,
        );
      }

      if (event.key === "ArrowRight") {
        setActiveImageIndex((current) =>
          current === null ? current : (current + 1) % images.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, images.length]);

  if (!isReady && !record) {
    return (
      <SectionCard title="기록 불러오는 중" description="상세 내용을 준비하고 있습니다.">
        <div className="soft-panel h-80 animate-pulse" />
      </SectionCard>
    );
  }

  if (!record) {
    return (
      <SectionCard
        title="기록을 찾을 수 없습니다"
        description="삭제되었거나 현재 아카이브 모드에서 볼 수 없는 기록입니다."
      >
        <Link
          href="/recent"
          className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
        >
          최근 기록으로 돌아가기
        </Link>
      </SectionCard>
    );
  }

  const rating = getRecordRating(record);
  const area = getRecordArea(record);
  const title = toDisplayText(record.title, "제목 없음");
  const summary = toDisplayText(record.summary);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${record.subcategory || record.category || "기타"} 기록`}
        title={title}
        description={summary}
      >
        <div className="rounded-[28px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
          <Link
            href="/recent"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <ArrowLeft className="h-4 w-4" />
            최근 기록으로
          </Link>
          {rating !== null ? <RatingStars rating={rating} className="mt-4" /> : null}
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="기록 정보" description="이 기록의 기본 정보입니다.">
          <div className="space-y-4">
            <DetailItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="날짜"
              value={formatDate(record.eventDate ?? record.createdAt)}
            />
            <DetailItem
              icon={<NotebookPen className="h-4 w-4" />}
              label="저장 경로"
              value={getSourceLabel(record)}
            />
            <DetailItem
              icon={<Star className="h-4 w-4" />}
              label="중요도"
              value={`${record.importance ?? "-"} / 5 · ${getImportanceLabel(record.importance ?? 1)}`}
            />
            {area ? (
              <DetailItem icon={<MapPin className="h-4 w-4" />} label="지역" value={area} />
            ) : null}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                <Tags className="h-4 w-4" />
                태그
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Array.isArray(record.tags) ? record.tags : []).map((tag) => (
                  <Link
                    key={tag}
                    href={`/recent?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs text-stone-600"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="요약과 본문" description="기록에 저장된 전체 내용입니다.">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-stone-100 bg-stone-50/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Summary</p>
              <p className="mt-3 text-base leading-8 text-stone-800">{summary}</p>
            </div>
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Body</p>
              {isHtmlDocument(record.body) ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
                    HTML 원문은 상세 페이지를 불안정하게 만들 수 있어 읽기용 문서 형태로 표시합니다.
                  </div>
                  <p className="whitespace-pre-line text-sm leading-8 text-stone-700">
                    {readableBody || "이 기록에 저장된 본문이 없습니다."}
                  </p>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">
                  {readableBody || "이 기록에 저장된 본문이 없습니다."}
                </p>
              )}
            </div>
            {hasDisplayText(record.notes) ? (
              <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Notes</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">
                  {toDisplayText(record.notes)}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {images.length > 0 ? (
        <SectionCard title="이미지" description="이 기록에 첨부된 사진과 스크린샷입니다.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className="rounded-[24px] border border-stone-100 bg-white/80 p-3 text-left transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-stone-100">
                  <Image
                    src={image.url}
                    alt={image.altText || record.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {image.isPrimary ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-white">
                      대표 이미지
                    </span>
                  ) : null}
                </div>
                {image.caption ? (
                  <p className="mt-3 text-sm leading-6 text-stone-600">{image.caption}</p>
                ) : null}
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {record.thought ? (
        <SectionCard title="생각 상세" description="이 기록에 저장된 생각 구조입니다.">
          <DetailGrid
            items={[
              ["생각 유형", record.thought.thoughtType],
              ["한 줄 생각", record.thought.oneLineThought],
              ["확장 메모", record.thought.expandedNote],
              ["실행 필요", record.thought.actionNeeded ? "예" : "아니오"],
              ["다시 보기", record.thought.worthRevisiting ? "예" : "아니오"],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.word ? (
        <SectionCard title="단어 상세" description="저장한 단어의 뜻과 쓰임 메모입니다.">
          <DetailGrid
            items={[
              ["단어", record.word.term],
              ["의미", record.word.meaning],
              ["예문", record.word.example],
              ["저장 이유", record.word.whySaved],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.content ? (
        <SectionCard title="콘텐츠 상세" description="콘텐츠에 남긴 반응과 평점입니다.">
          <DetailGrid
            items={[
              ["콘텐츠 유형", record.content.contentType],
              ["원제", record.content.titleOriginal || "-"],
              ["한 줄 리뷰", record.content.oneLineReview],
              ["기억에 남은 점", formatListValue(record.content.memorablePoints)],
              ["아쉬운 점", formatListValue(record.content.weakPoints)],
              ["기억에 남는 문장", record.content.memorableQuote || "-"],
              ["다시 보기 의도", record.content.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.place ? (
        <SectionCard title="장소 상세" description="장소에 대한 정보와 재방문 메모입니다.">
          <DetailGrid
            items={[
              ["장소명", record.place.placeName],
              ["지역", record.place.area],
              ["주소", record.place.address || "-"],
              ["장소 유형", record.place.placeType],
              ["방문일", formatDate(record.place.visitDate)],
              ["한 줄 리뷰", record.place.oneLineReview],
              ["함께한 사람", record.place.withWhom || "-"],
              ["분위기", record.place.atmosphereNote || "-"],
              ["가격 메모", record.place.priceNote || "-"],
              ["재방문 의도", record.place.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.activity ? (
        <SectionCard title="활동 상세" description="활동의 맥락과 만족도 기록입니다.">
          <DetailGrid
            items={[
              ["활동 유형", record.activity.activityType],
              ["위치", record.activity.location],
              ["거리", record.activity.distanceKm ? `${record.activity.distanceKm} km` : "-"],
              [
                "시간",
                record.activity.durationMinutes ? `${record.activity.durationMinutes}분` : "-",
              ],
              ["난이도", `${record.activity.difficulty}/5`],
              ["만족도", `${record.activity.satisfactionRating}/5`],
              ["컨디션 메모", record.activity.physicalConditionNote || "-"],
              ["요약", record.activity.summary],
            ]}
          />
        </SectionCard>
      ) : null}

      <ImageLightbox
        images={images}
        activeIndex={activeImageIndex}
        onClose={() => setActiveImageIndex(null)}
        onPrev={() =>
          setActiveImageIndex((current) =>
            current === null ? current : (current - 1 + images.length) % images.length,
          )
        }
        onNext={() =>
          setActiveImageIndex((current) =>
            current === null ? current : (current + 1) % images.length,
          )
        }
      />
    </div>
  );
}

function hasFullRecordDetail(record: ArchiveRecord | null) {
  if (!record) {
    return false;
  }

  return Boolean(
    record.body ||
      record.notes ||
      record.thought ||
      record.word ||
      record.content ||
      record.place ||
      record.activity ||
      (record.images?.length ?? 0) > 0,
  );
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
    return value;
  }

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    doc.querySelectorAll("script, style, noscript, iframe, svg").forEach((node) => node.remove());
    const text = doc.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text;
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

function hasDisplayText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
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

function formatListValue(value: unknown) {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return items.length > 0 ? items.join(", ") : "-";
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value.trim() : "-";
  }

  return "-";
}

function DetailItem({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm leading-7 text-stone-600">{value}</p>
    </div>
  );
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "-";
}

function DetailGrid({ items }: Readonly<{ items: Array<[string, unknown]> }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{safeString(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: Readonly<{
  images: ArchiveImage[];
  activeIndex: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}>) {
  if (activeIndex === null || !images[activeIndex]) {
    return null;
  }

  const activeImage = images[activeIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="이미지 뷰어"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowLeft") onPrev();
        if (event.key === "ArrowRight") onNext();
      }}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 text-white">
          <div>
            <p className="text-sm font-medium">{activeImage.caption || "첨부 이미지"}</p>
            <p className="text-xs text-white/70">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white"
            aria-label="이미지 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-stone-950">
          <div className="relative aspect-[4/3] max-h-[75vh] w-full">
            <Image
              src={activeImage.url}
              alt={activeImage.altText || activeImage.caption || "첨부 이미지"}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-2 text-white"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-2 text-white"
                aria-label="다음 이미지"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
