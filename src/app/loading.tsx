export default function HomeLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Tab bar skeleton */}
      <div className="sticky top-0 z-20 bg-bg -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6">
        <div className="flex border-b border-border justify-center gap-8">
          <div className="h-10 w-28 bg-border-subtle rounded" />
          <div className="h-10 w-28 bg-border-subtle rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="min-w-0 space-y-4">
          {/* Composer skeleton */}
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-border-subtle rounded w-3/4" />
                <div className="h-4 bg-border-subtle rounded w-1/2" />
              </div>
            </div>
          </div>
          {/* Post skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-border-subtle" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-border-subtle rounded" />
                  <div className="h-3 w-16 bg-border-subtle rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-border-subtle rounded w-full" />
                <div className="h-4 bg-border-subtle rounded w-5/6" />
                <div className="h-4 bg-border-subtle rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
        {/* Sidebar skeleton */}
        <div className="hidden lg:block">
          <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
            <div className="h-4 w-32 bg-border-subtle rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-border-subtle shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-20 bg-border-subtle rounded" />
                  <div className="h-3 w-14 bg-border-subtle rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
