export default function ExplorarLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-border-subtle rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-border-subtle rounded-full" />
            </div>
            <div className="h-5 w-3/4 bg-border-subtle rounded" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-border-subtle rounded w-full" />
              <div className="h-3.5 bg-border-subtle rounded w-5/6" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-border-subtle" />
              <div className="h-3 w-20 bg-border-subtle rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
