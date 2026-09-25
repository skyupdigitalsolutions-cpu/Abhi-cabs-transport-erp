import { useState, useRef, useEffect, forwardRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * DatePicker — fully replaces the native browser <input type="date"> (and its
 * unstyleable OS calendar popup) with an attractive, on-brand calendar
 * dropdown. Drop-in replacement: same value/onChange contract as a native
 * date input ('YYYY-MM-DD' string in, synthetic { target: { value } } out),
 * so every existing field() / setFilter() handler keeps working unchanged.
 */
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseISO(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const navBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 7, border: 'none',
  backgroundColor: 'transparent', cursor: 'pointer', color: '#5A5A5A',
  transition: 'background-color 0.15s',
};

const linkBtnStyle = {
  border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 11.5, fontWeight: 700, color: '#374151', padding: '4px 6px', borderRadius: 6,
};

const DatePicker = forwardRef(function DatePicker({
  value, onChange, onBlur, placeholder = 'Select date', error, disabled,
  min, max, style, className, id, name,
}, ref) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const minDate = parseISO(min);
  const maxDate = parseISO(max);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const containerRef = useRef(null);
  const internalRef = useRef(null);
  const resolvedRef = ref || internalRef;

  useEffect(() => {
    if (open) setViewDate(selected || new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    onBlur?.({ target: { value } });
  }

  function pick(date) {
    if (isDisabledDay(date)) return;
    onChange?.({ target: { value: toISO(date) } });
    close();
  }

  function isDisabledDay(date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function clearVal(e) {
    e.stopPropagation();
    onChange?.({ target: { value: '' } });
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  const now = new Date();

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }} className={className}>
      <button
        ref={resolvedRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          width: '100%', borderRadius: 10,
          border: `1.5px solid ${error ? '#DC2626' : open ? '#FFC107' : '#E8E8E4'}`,
          padding: '9px 12px', fontSize: 13.5, fontWeight: 600,
          backgroundColor: disabled ? '#F5F5F3' : '#ffffff',
          color: selected ? '#111111' : '#9A9A9A',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? selected.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}
        </span>
        <CalendarIcon size={14} style={{ color: '#9A9A9A', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            backgroundColor: '#ffffff', border: '1.5px solid #E8E8E4', borderRadius: 12,
            boxShadow: '0 12px 36px rgba(17,17,17,0.12), 0 4px 12px rgba(17,17,17,0.06)',
            padding: 12, width: 252,
            animation: 'dpSlideDown 0.18s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              style={navBtnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>
              {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              style={navBtnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#9A9A9A', padding: '4px 0' }}>
                {w}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, now);
              const dayDisabled = isDisabledDay(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => pick(d)}
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: isToday && !isSel ? '1.5px solid #FFC107' : 'none',
                    cursor: dayDisabled ? 'not-allowed' : 'pointer',
                    fontSize: 12.5, fontWeight: isSel ? 700 : 500,
                    backgroundColor: isSel ? '#FFC107' : 'transparent',
                    color: dayDisabled ? '#D1D1CC' : isSel ? '#111111' : '#374151',
                    transition: 'background-color 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isSel && !dayDisabled) e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #F0F0EC' }}>
            <button
              type="button"
              onClick={() => pick(new Date())}
              disabled={isDisabledDay(now)}
              style={{ ...linkBtnStyle, opacity: isDisabledDay(now) ? 0.4 : 1, cursor: isDisabledDay(now) ? 'not-allowed' : 'pointer' }}
            >
              Today
            </button>
            {selected && (
              <button type="button" onClick={clearVal} style={{ ...linkBtnStyle, color: '#DC2626' }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dpSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default DatePicker;
