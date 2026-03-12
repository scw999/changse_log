import { cx } from "@/lib/archive/utils";

interface RatingStarsProps {
  rating: number;
  className?: string;
}

function StarRow({ className }: Readonly<{ className: string }>) {
  return (
    <div className={cx("flex gap-0.5 text-sm", className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>★</span>
      ))}
    </div>
  );
}

export function RatingStars({ rating, className }: Readonly<RatingStarsProps>) {
  const width = `${Math.max(0, Math.min(rating, 5)) * 20}%`;

  return (
    <div className={cx("inline-flex items-center gap-2", className)}>
      <div className="relative">
        <StarRow className="text-stone-300" />
        <div className="absolute inset-0 overflow-hidden" style={{ width }}>
          <StarRow className="text-amber-500" />
        </div>
      </div>
      <span className="text-sm font-medium text-stone-700">{rating.toFixed(1)}</span>
    </div>
  );
}
