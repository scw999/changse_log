import { cx } from "@/lib/archive/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  children,
}: Readonly<PageHeaderProps>) {
  return (
    <section className={cx("panel relative overflow-hidden px-5 py-6 sm:px-6 md:px-8 md:py-9", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500 sm:tracking-[0.34em]">
        {eyebrow}
      </p>
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="break-keep font-display text-[2.1rem] leading-[1.12] text-stone-900 sm:text-[2.4rem] md:text-[2.8rem]">
            {title}
          </h1>
          <p className="mt-3 break-keep text-sm leading-7 text-stone-600 md:text-base">
            {description}
          </p>
        </div>
        {children ? <div className="min-w-0 md:max-w-sm">{children}</div> : null}
      </div>
    </section>
  );
}
