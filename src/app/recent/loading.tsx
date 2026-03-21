export default function RecentLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="panel px-5 py-6 sm:px-6 md:px-8 md:py-9">
        <div className="h-3 w-32 rounded bg-stone-200" />
        <div className="mt-4 h-10 w-1/2 rounded bg-stone-200" />
        <div className="mt-3 h-4 w-1/3 rounded bg-stone-100" />
      </div>

      <div className="panel px-5 py-5 md:px-6">
        <div className="h-10 w-full rounded-xl bg-stone-100" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="soft-panel h-56" />
          ))}
        </div>
      </div>
    </div>
  );
}
