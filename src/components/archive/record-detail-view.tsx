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
import { ArchiveImage } from "@/lib/archive/types";
import {
  formatDate,
  getImportanceLabel,
  getRecordArea,
  getRecordRating,
  getSourceLabel,
  normalizeImages,
} from "@/lib/archive/utils";

export function RecordDetailView({ id }: Readonly<{ id: string }>) {
  const { records, isReady } = useArchive();
  const record = records.find((item) => item.id === id);
  const images = useMemo(() => normalizeImages(record?.images ?? []), [record?.images]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

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
      <SectionCard title="기록을 불러오는 중" description="저장된 아카이브를 확인하고 있습니다.">
        <div className="soft-panel h-80 animate-pulse" />
      </SectionCard>
    );
  }

  if (!record) {
    return (
      <SectionCard
        title="기록을 찾을 수 없습니다"
        description="삭제되었거나 아직 로딩이 완료되지 않았습니다."
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

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`${record.subcategory} Record`} title={record.title} description={record.summary}>
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
        <SectionCard title="기본 정보" description="기록의 공통 메타데이터">
          <div className="space-y-4">
            <DetailItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="이벤트 날짜"
              value={formatDate(record.eventDate)}
            />
            <DetailItem
              icon={<NotebookPen className="h-4 w-4" />}
              label="저장 경로"
              value={getSourceLabel(record)}
            />
            <DetailItem
              icon={<Star className="h-4 w-4" />}
              label="중요도"
              value={`${record.importance} · ${getImportanceLabel(record.importance)}`}
            />
            {area ? (
              <DetailItem icon={<MapPin className="h-4 w-4" />} label="지역 / 위치" value={area} />
            ) : null}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                <Tags className="h-4 w-4" />
                태그
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {record.tags.map((tag) => (
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

        <SectionCard title="본문과 요약" description="정리된 텍스트 기록">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-stone-100 bg-stone-50/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Summary</p>
              <p className="mt-3 text-base leading-8 text-stone-800">{record.summary}</p>
            </div>
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Body</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">{record.body}</p>
            </div>
            {record.notes ? (
              <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Notes</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">{record.notes}</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {images.length > 0 ? (
        <SectionCard title="이미지" description="저장된 사진과 스크린샷">
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
        <SectionCard title="생각 상세" description="리플렉션과 메모 구조">
          <DetailGrid
            items={[
              ["생각 유형", record.thought.thoughtType],
              ["한 줄 생각", record.thought.oneLineThought],
              ["확장 노트", record.thought.expandedNote],
              ["액션 필요", record.thought.actionNeeded ? "예" : "아니오"],
              ["다시 볼 가치", record.thought.worthRevisiting ? "높음" : "보통"],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.word ? (
        <SectionCard title="단어 상세" description="저장한 표현과 의미">
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
        <SectionCard title="콘텐츠 상세" description="감상과 재방문 의도를 담은 기록">
          <DetailGrid
            items={[
              ["콘텐츠 유형", record.content.contentType],
              ["원제", record.content.titleOriginal || "-"],
              ["한 줄 리뷰", record.content.oneLineReview],
              ["기억 포인트", record.content.memorablePoints.join(" · ")],
              ["아쉬운 점", record.content.weakPoints?.join(" · ") || "-"],
              ["인상 문장", record.content.memorableQuote || "-"],
              ["재감상 의도", record.content.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.place ? (
        <SectionCard title="장소 상세" description="장소의 분위기와 재방문 의도">
          <DetailGrid
            items={[
              ["장소명", record.place.placeName],
              ["지역", record.place.area],
              ["주소", record.place.address || "-"],
              ["유형", record.place.placeType],
              ["방문일", formatDate(record.place.visitDate)],
              ["한 줄 리뷰", record.place.oneLineReview],
              ["동행", record.place.withWhom || "-"],
              ["분위기", record.place.atmosphereNote || "-"],
              ["가격 메모", record.place.priceNote || "-"],
              ["재방문 의도", record.place.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.activity ? (
        <SectionCard title="활동 상세" description="운동과 트래킹 기록">
          <DetailGrid
            items={[
              ["활동 유형", record.activity.activityType],
              ["위치", record.activity.location],
              ["거리", record.activity.distanceKm ? `${record.activity.distanceKm} km` : "-"],
              ["시간", record.activity.durationMinutes ? `${record.activity.durationMinutes}분` : "-"],
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

function DetailGrid({ items }: Readonly<{ items: Array<[string, string]> }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{value}</p>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6"
      onClick={onClose}
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
