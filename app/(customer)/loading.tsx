export default function CustomerLoading() {
  return (
    <div className="min-h-screen bg-surface-2">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-surface-3 animate-shimmer" />
        <div className="w-28 h-5 rounded bg-surface-3 animate-shimmer" />
      </header>
      <div className="p-4 space-y-3 max-w-md mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-3 animate-shimmer" />
        ))}
      </div>
    </div>
  );
}
