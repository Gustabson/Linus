export default function CorreosLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-3 animate-pulse">
      <div className="h-8 w-40 bg-border-subtle rounded mb-6" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-32 bg-border-subtle rounded" />
            <div className="h-3 w-3/4 bg-border-subtle rounded" />
          </div>
          <div className="h-3 w-16 bg-border-subtle rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}
