export default function NotificacionesLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 animate-pulse">
      <div className="h-8 w-48 bg-border-subtle rounded mb-6" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-border p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-border-subtle rounded w-4/5" />
            <div className="h-3 w-24 bg-border-subtle rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
