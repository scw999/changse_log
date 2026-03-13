import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Repeat2, Tags } from "lucide-react";

import { RatingStars } from "@/components/ui/rating-stars";
import { ArchiveRecord } from "@/lib/archive/types";
import {
  cx,
  formatDate,
  getCategoryMeta,
  getImportanceLabel,
  getRecordLocationLabel,
  getRecordMetaLine,
  getRecordRating,
  getRepresentativeImage,
  getTypeSpecificHeadline,
  isRevisitCandidate,
} from "@/lib/archive/utils";

interface RecordCardProps {
  record: ArchiveRecord;
  compact?: boolean;
}

export function RecordCard({ record, compact = false }: Readonly<RecordCardProps>) {
  const meta = getCategoryMeta(record.category);
  const rating = getRecordRating(record);
  const location = getRecordLocationLabel(record);
  const headline = getTypeSpecificHeadline(record);
  const thumbnail = getRepresentativeImage(record);

  return (
    <Link
      href={`/records/${record.id}`}
      className={cx(
        "group panel relative block overflow-hidden transition-transform duration-200 hover:-translate-y-0.5",
        compact ? "px-4 py-4" : "px-5 py-5 md:px-6",
      )}
    >
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br opacity-80",
          meta.accentClass,
        )}
      />
      <div className="relative">
        {thumbnail ? (
          <div className="mb-4 overflow-hidden rounded-[24px] border border-white/70 bg-stone-100">
            <div className={cx("relative", compact ? "aspect-[16/9]" : "aspect-[5/3]")}>
              <Image
                src={thumbnail.url}
                alt={thumbnail.altText || thumbnail.caption || record.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                sizes={compact ? "(max-width: 1280px) 100vw, 50vw" : "(max-width: 1280px) 100vw, 40vw"}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">
              {getRecordMetaLine(record)}
            </p>
            <h3
              className={cx(
                "mt-3 font-display leading-tight text-stone-950",
                compact ? "text-xl" : "text-2xl",
              )}
            >
              {record.title}
            </h3>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition group-hover:text-stone-700" />
        </div>

        {rating !== null ? <RatingStars rating={rating} className="mt-4" /> : null}

        <p className="mt-4 text-sm leading-7 text-stone-600">{record.summary}</p>

        {headline ? <p className="mt-3 text-sm leading-6 text-stone-700">{headline}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {record.tags.slice(0, compact ? 3 : 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs text-stone-600 shadow-sm"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(record.eventDate ?? record.createdAt)}
          </span>
          {location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Tags className="h-3.5 w-3.5" />
            중요도 {record.importance} · {getImportanceLabel(record.importance)}
          </span>
          {isRevisitCandidate(record) ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Repeat2 className="h-3.5 w-3.5" />
              다시 볼 가치 있음
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
