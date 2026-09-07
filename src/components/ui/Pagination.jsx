import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange, total, limit }) {
  if (totalPages <= 1) return total ? (
    <p className="text-[10px] px-1 font-bold" style={{ color: '#9A9A9A' }}>{total} result{total === 1 ? '' : 's'}</p>
  ) : null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  const btnBase = 'h-8 w-8 grid place-items-center rounded-lg border text-xs font-bold focus-ring transition-colors';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-1">
      <p className="text-[10px] font-bold" style={{ color: '#9A9A9A' }}>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={btnBase}
          style={{ borderColor: '#E8E8E4', color: '#9A9A9A' }}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1" style={{ color: '#E8E8E4' }}>…</span>}
            <button
              onClick={() => onChange(p)}
              className="h-8 min-w-8 px-2 rounded-lg text-xs font-bold focus-ring"
              style={
                p === page
                  ? { backgroundColor: '#FFC107', color: '#111111' }
                  : { color: '#5A5A5A' }
              }
            >
              {p}
            </button>
          </span>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={btnBase}
          style={{ borderColor: '#E8E8E4', color: '#9A9A9A' }}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
