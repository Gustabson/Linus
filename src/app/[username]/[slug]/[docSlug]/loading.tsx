export default function DocumentLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Header card */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-20 bg-border-subtle rounded" />
        {/* Title */}
        <div className="space-y-2">
          <div className="h-7 w-2/3 bg-border-subtle rounded" />
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-border-subtle rounded" />
            <div className="h-4 w-32 bg-border-subtle rounded" />
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-border-subtle rounded-xl" />
          <div className="h-9 w-24 bg-border-subtle rounded-xl" />
          <div className="h-9 w-20 bg-border-subtle rounded-xl" />
        </div>
      </div>

      {/* Sections skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-6 space-y-3">
            <div className="h-5 w-48 bg-border-subtle rounded" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-border-subtle rounded" />
              <div className="h-4 w-5/6 bg-border-subtle rounded" />
              <div className="h-4 w-3/4 bg-border-subtle rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
