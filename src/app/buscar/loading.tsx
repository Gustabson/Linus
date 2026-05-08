export default function BuscarLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-11 bg-border-subtle rounded-xl w-full" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-border-subtle shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-border-subtle rounded" />
              <div className="h-3 w-24 bg-border-subtle rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
