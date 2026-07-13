export default function TreeLoading() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-pulse">
      {/* Card skeleton */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-border-subtle" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-border-subtle rounded" />
            <div className="h-3 w-20 bg-border-subtle rounded" />
          </div>
        </div>
        {/* Title */}
        <div className="space-y-2">
          <div className="h-7 w-3/4 bg-border-subtle rounded" />
          <div className="h-4 w-full bg-border-subtle rounded" />
          <div className="h-4 w-2/3 bg-border-subtle rounded" />
        </div>
        {/* Stats */}
        <div className="flex gap-5 pt-2 border-t border-border-subtle">
          <div className="h-4 w-16 bg-border-subtle rounded" />
          <div className="h-4 w-20 bg-border-subtle rounded" />
          <div className="h-4 w-24 bg-border-subtle rounded" />
        </div>
        {/* Documents */}
        <div className="space-y-3 pt-2">
          <div className="h-3 w-24 bg-border-subtle rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-bg rounded-xl border border-border-subtle" />
          ))}
        </div>
      </div>

      {/* Attachments skeleton */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-3">
        <div className="h-5 w-40 bg-border-subtle rounded" />
        <div className="h-16 bg-bg rounded-xl border border-border-subtle" />
      </div>
    </div>
  );
}
