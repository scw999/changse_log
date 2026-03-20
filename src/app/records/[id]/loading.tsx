export default function RecordDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="panel px-5 py-6 sm:px-6 md:px-8 md:py-9">
        <div className="h-3 w-24 rounded bg-stone-200" />
        <div className="mt-4 h-10 w-2/3 rounded bg-stone-200" />
        <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="panel px-5 py-5 md:px-6">
          <div className="h-6 w-28 rounded bg-stone-200" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-stone-100" />
            ))}
          </div>
        </div>
        <div className="panel px-5 py-5 md:px-6">
          <div className="h-6 w-32 rounded bg-stone-200" />
          <div className="mt-4 space-y-5">
            <div className="h-32 rounded-[24px] bg-stone-100" />
            <div className="h-48 rounded-[24px] bg-stone-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
