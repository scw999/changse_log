export default function HomeLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="panel px-5 py-6 sm:px-6 md:px-8 md:py-9">
        <div className="h-3 w-40 rounded bg-stone-200" />
        <div className="mt-4 h-10 w-3/4 rounded bg-stone-200" />
        <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="soft-panel px-5 py-5">
            <div className="h-3 w-20 rounded bg-stone-200" />
            <div className="mt-3 h-8 w-16 rounded bg-stone-200" />
            <div className="mt-2 h-4 w-32 rounded bg-stone-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel px-5 py-5 md:px-6">
          <div className="h-6 w-40 rounded bg-stone-200" />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="soft-panel h-48" />
            ))}
          </div>
        </div>
        <div className="panel px-5 py-5 md:px-6">
          <div className="h-6 w-28 rounded bg-stone-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="soft-panel h-28" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
