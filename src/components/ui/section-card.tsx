import { forwardRef } from "react";

import { cx } from "@/lib/archive/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const SectionCard = forwardRef<HTMLElement, Readonly<SectionCardProps>>(function SectionCard(
  {
    title,
    description,
    className,
    action,
    children,
  },
  ref,
) {
  return (
    <section ref={ref} className={cx("panel px-5 py-5 md:px-6", className)}>
      {title || description || action ? (
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            {title ? <h2 className="font-display text-2xl text-stone-900">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
});
