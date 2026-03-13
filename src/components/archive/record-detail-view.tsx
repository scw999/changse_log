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
  const images = useMemo(() => normalizeImages(record?.images ?? []), [record?.images]);
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
      <SectionCard title="Loading record" description="Preparing the full record view.">
        <div className="soft-panel h-80 animate-pulse" />
      </SectionCard>
    );
  }

  if (!record) {
    return (
      <SectionCard
        title="Record not found"
        description="This record may have been removed or is not available in the current archive mode."
      >
        <Link
          href="/recent"
          className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
        >
          Back to recent records
        </Link>
      </SectionCard>
    );
  }

  const rating = getRecordRating(record);
  const area = getRecordArea(record);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${record.subcategory} Record`}
        title={record.title}
        description={record.summary}
      >
        <div className="rounded-[28px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
          <Link
            href="/recent"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to recent
          </Link>
          {rating !== null ? <RatingStars rating={rating} className="mt-4" /> : null}
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Record meta" description="Core information for this entry.">
          <div className="space-y-4">
            <DetailItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="Date"
              value={formatDate(record.eventDate ?? record.createdAt)}
            />
            <DetailItem
              icon={<NotebookPen className="h-4 w-4" />}
              label="Source"
              value={getSourceLabel(record)}
            />
            <DetailItem
              icon={<Star className="h-4 w-4" />}
              label="Importance"
              value={`${record.importance} / 5 - ${getImportanceLabel(record.importance)}`}
            />
            {area ? (
              <DetailItem icon={<MapPin className="h-4 w-4" />} label="Area" value={area} />
            ) : null}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                <Tags className="h-4 w-4" />
                Tags
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

        <SectionCard title="Summary and body" description="The full text saved for this record.">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-stone-100 bg-stone-50/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Summary</p>
              <p className="mt-3 text-base leading-8 text-stone-800">{record.summary}</p>
            </div>
            <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Body</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">
                {record.body || "No body text saved for this record."}
              </p>
            </div>
            {record.notes ? (
              <div className="rounded-[24px] border border-stone-100 bg-white/80 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Notes</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-stone-700">
                  {record.notes}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {images.length > 0 ? (
        <SectionCard title="Images" description="Photos and screenshots attached to this record.">
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
                      Primary
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
        <SectionCard title="Thought details" description="Structured reflection fields for this entry.">
          <DetailGrid
            items={[
              ["Thought type", record.thought.thoughtType],
              ["One line thought", record.thought.oneLineThought],
              ["Expanded note", record.thought.expandedNote],
              ["Action needed", record.thought.actionNeeded ? "Yes" : "No"],
              ["Worth revisiting", record.thought.worthRevisiting ? "Yes" : "No"],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.word ? (
        <SectionCard title="Word details" description="Meaning and usage notes saved for the word.">
          <DetailGrid
            items={[
              ["Word", record.word.term],
              ["Meaning", record.word.meaning],
              ["Example", record.word.example],
              ["Why saved", record.word.whySaved],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.content ? (
        <SectionCard title="Content details" description="Saved reactions and ratings for content.">
          <DetailGrid
            items={[
              ["Content type", record.content.contentType],
              ["Original title", record.content.titleOriginal || "-"],
              ["One line review", record.content.oneLineReview],
              ["Memorable points", record.content.memorablePoints.join(", ") || "-"],
              ["Weak points", record.content.weakPoints?.join(", ") || "-"],
              ["Memorable quote", record.content.memorableQuote || "-"],
              ["Revisit intent", record.content.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.place ? (
        <SectionCard title="Place details" description="Location and revisit notes for the place.">
          <DetailGrid
            items={[
              ["Place name", record.place.placeName],
              ["Area", record.place.area],
              ["Address", record.place.address || "-"],
              ["Place type", record.place.placeType],
              ["Visit date", formatDate(record.place.visitDate)],
              ["One line review", record.place.oneLineReview],
              ["With whom", record.place.withWhom || "-"],
              ["Atmosphere", record.place.atmosphereNote || "-"],
              ["Price note", record.place.priceNote || "-"],
              ["Revisit intent", record.place.revisitIntent],
            ]}
          />
        </SectionCard>
      ) : null}

      {record.activity ? (
        <SectionCard title="Activity details" description="Context and satisfaction for the activity.">
          <DetailGrid
            items={[
              ["Activity type", record.activity.activityType],
              ["Location", record.activity.location],
              ["Distance", record.activity.distanceKm ? `${record.activity.distanceKm} km` : "-"],
              [
                "Duration",
                record.activity.durationMinutes ? `${record.activity.durationMinutes} min` : "-",
              ],
              ["Difficulty", `${record.activity.difficulty}/5`],
              ["Satisfaction", `${record.activity.satisfactionRating}/5`],
              ["Physical condition", record.activity.physicalConditionNote || "-"],
              ["Summary", record.activity.summary],
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
            <p className="text-sm font-medium">{activeImage.caption || "Attached image"}</p>
            <p className="text-xs text-white/70">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white"
            aria-label="Close image"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-stone-950">
          <div className="relative aspect-[4/3] max-h-[75vh] w-full">
            <Image
              src={activeImage.url}
              alt={activeImage.altText || activeImage.caption || "Attached image"}
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
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-2 text-white"
                aria-label="Next image"
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
