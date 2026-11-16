function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading page">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>

      <Skeleton className="h-64" />
    </div>
  );
}
