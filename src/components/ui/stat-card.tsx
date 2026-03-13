import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cx } from "@/lib/archive/utils";

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  href?: string;
  className?: string;
}

export function StatCard({ label, value, note, href, className }: Readonly<StatCardProps>) {
  const classes = cx(
    "soft-panel px-5 py-5",
    href && "group block transition duration-200 hover:-translate-y-0.5 hover:bg-white/90",
    className,
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
        {href ? (
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 transition group-hover:text-stone-700" />
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl text-stone-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{note}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes}>
      {content}
    </div>
  );
}
