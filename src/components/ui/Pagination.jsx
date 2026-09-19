import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({ page, totalPages, onChange, total, limit, onLimitChange }) {
  const sizePicker = onLimitChange && (
    <select
      value={limit}
      onChange={(e) => onLimitChange(e.target.value)}
      style={{
        fontSize: 12.5, fontWeight: 700, color: '#5A5A5A', border: '1px solid #E8E8E4',
        borderRadius: 6, padding: '3px 6px', backgroundColor: '#fff', cursor: 'pointer',
      }}
    >
      {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
    </select>
  );

  const btnBase = 'h-8 w-8 grid place-items-center rounded-lg border text-xs font-bold focus-ring transition-colors';

  // FIX: with only one page of results, this used to render just a plain
  // "N results" line and nothing else — no page indicator, no arrows, even
  // disabled ones. That reads as broken/incomplete rather than "there's
  // simply nothing more to page to." Now always shows the same pager shape
  // (Page 1 of 1, both arrows disabled) so the UI looks consistent whether
  // there's 1 page or 20.
  if (totalPages <= 1) {
    return total ? (
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <div className="flex items-center gap-3">
          <p className="text-[11.5px] font-bold" style={{ color: '#9A9A9A' }}>{total} result{total === 1 ? '' : 's'}</p>
          {sizePicker}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-bold" style={{ color: '#9A9A9A' }}>Page 1 of 1</span>
          <button disabled className={btnBase} style={{ borderColor: '#E8E8E4', color: '#D1D5DB' }} aria-label="Previous page">
            <ChevronLeft size={14} />
          </button>
          <button disabled className={btnBase} style={{ borderColor: '#E8E8E4', color: '#D1D5DB' }} aria-label="Next page">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    ) : null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-1">
      <div className="flex items-center gap-3">
        <p className="text-[11.5px] font-bold" style={{ color: '#9A9A9A' }}>
          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
        </p>
        {sizePicker}
      </div>
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
