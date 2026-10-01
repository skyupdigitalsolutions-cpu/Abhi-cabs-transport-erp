/** Skeletons — MUI <Skeleton> (wave animation). */
import MuiSkeleton from '@mui/material/Skeleton';
import Card from './Card';

export function Skeleton({ className }) {
  return <MuiSkeleton variant="rounded" animation="wave" className={className} sx={{ height: 'auto', minHeight: 12 }} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: '1px solid #F2F2EE' }}>
          {Array.from({ length: cols }).map((__, c) => (
            <MuiSkeleton key={c} variant="rounded" animation="wave" height={16} sx={{ flex: c === 0 ? '0 0 32px' : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <MuiSkeleton animation="wave" width="33%" height={18} />
      <MuiSkeleton animation="wave" width="50%" height={34} />
      <MuiSkeleton animation="wave" width="66%" height={14} />
    </Card>
  );
}
