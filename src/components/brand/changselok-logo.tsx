import { cx } from "@/lib/archive/utils";

export function ChangseLogLogo({
  compact = false,
}: Readonly<{
  compact?: boolean;
}>) {
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className={cx(
          "relative overflow-hidden rounded-[18px] border border-stone-200/80 bg-white/90 shadow-sm",
          compact ? "h-11 w-11" : "h-14 w-14",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.35),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.25),_transparent_50%)]" />
        <div className="absolute inset-0 flex items-center justify-center font-display text-stone-950">
          <span className={compact ? "text-xl" : "text-2xl"}>창</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">Private Archive</p>
        <p className={cx("font-display leading-none text-stone-950", compact ? "text-2xl" : "text-[2.15rem]")}>
          창세록
        </p>
      </div>
    </div>
  );
}
