export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 bg-border-subtle rounded" />
              <div className="h-3 w-20 bg-border-subtle rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-border-subtle rounded w-full" />
            <div className="h-4 bg-border-subtle rounded w-5/6" />
            <div className="h-4 bg-border-subtle rounded w-2/3" />
          </div>
          <div className="flex gap-4 pt-1">
            <div className="h-4 w-12 bg-border-subtle rounded" />
            <div className="h-4 w-12 bg-border-subtle rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
