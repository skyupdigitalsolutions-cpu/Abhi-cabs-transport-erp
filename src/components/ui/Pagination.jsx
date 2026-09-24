import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const PAGE_SIZES = [10, 25, 50, 100];

/** Tiny inline custom dropdown for page-size — no native <select>. */
function SizePicker({ limit, onLimitChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 700, color: '#5A5A5A',
          border: '1.5px solid #E8E8E4', borderRadius: 8,
          padding: '4px 8px', backgroundColor: '#fff', cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        {limit} / page
        <ChevronDown size={11} style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.15s',
        }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
          zIndex: 50, backgroundColor: '#fff',
          border: '1.5px solid #E8E8E4', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(17,17,17,0.1)',
          padding: 4, minWidth: 100,
          animation: 'selectSlideDown 0.15s ease-out',
        }}>
          {PAGE_SIZES.map((n) => {
            const isActive = n === Number(limit);
            return (
              <div
                key={n}
                onClick={() => { onLimitChange(n); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: '#374151', cursor: 'pointer',
                  backgroundColor: isActive ? '#FFFBEA' : 'transparent',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>{n} / page</span>
                {isActive && <Check size={12} style={{ color: '#FFC107' }} strokeWidth={3} />}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes selectSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function Pagination({ page, totalPages, onChange, total, limit, onLimitChange }) {
  const sizePicker = onLimitChange && <SizePicker limit={limit} onLimitChange={onLimitChange} />;

  const btnBase = 'h-8 w-8 grid place-items-center rounded-lg border text-xs font-bold focus-ring transition-colors';

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
