import { cx } from "@/lib/archive/utils";

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  className?: string;
}

export function StatCard({ label, value, note, className }: Readonly<StatCardProps>) {
  return (
    <div className={cx("soft-panel px-5 py-5", className)}>
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
      <p className="mt-3 font-display text-3xl text-stone-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{note}</p>
    </div>
  );
}
