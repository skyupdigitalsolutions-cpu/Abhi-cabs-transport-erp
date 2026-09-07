import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ backgroundColor: '#E5E7EB' }} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: '1px solid #F7F8FC' }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={c === 0 ? 'h-4 w-8' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: '#E5E7EB', backgroundColor: '#ffffff' }}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
