import { useState, useRef, useEffect, forwardRef } from 'react';
import { Clock } from 'lucide-react';

/**
 * TimePicker — replaces the native <input type="time"> (and its inconsistent
 * OS/browser time widget) with a branded hour/minute scroller. Same
 * value/onChange contract as a native time input ('HH:MM' 24h string in,
 * synthetic { target: { value } } out).
 */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parseHM(str) {
  const m = /^(\d{1,2}):(\d{2})/.exec(str || '');
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function format12h(h, m) {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

const colStyle = {
  maxHeight: 168, overflowY: 'auto', display: 'flex', flexDirection: 'column',
  gap: 2, padding: '4px', width: 56, scrollbarWidth: 'thin',
};

function itemStyle(active) {
  return {
    textAlign: 'center', padding: '6px 0', borderRadius: 7, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
    backgroundColor: active ? '#FFC107' : 'transparent',
    color: active ? '#111111' : '#374151',
    transition: 'background-color 0.12s',
  };
}

const TimePicker = forwardRef(function TimePicker({
  value, onChange, onBlur, placeholder = 'Select time', error, disabled, style, className, id, name,
}, ref) {
  const [open, setOpen] = useState(false);
  const parsed = parseHM(value);
  const containerRef = useRef(null);
  const internalRef = useRef(null);
  const resolvedRef = ref || internalRef;
  const hourColRef = useRef(null);
  const minColRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      hourColRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
      minColRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
    }, 0);
  }, [open]);

  function close() {
    setOpen(false);
    onBlur?.({ target: { value } });
  }

  function setHour(h) {
    const m = parsed ? parsed.m : 0;
    onChange?.({ target: { value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` } });
  }

  function setMinute(m) {
    const h = parsed ? parsed.h : 0;
    onChange?.({ target: { value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` } });
  }

  function clearVal(e) {
    e.stopPropagation();
    onChange?.({ target: { value: '' } });
  }

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
          color: parsed ? '#111111' : '#9A9A9A',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {parsed ? format12h(parsed.h, parsed.m) : placeholder}
        </span>
        <Clock size={14} style={{ color: '#9A9A9A', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            backgroundColor: '#ffffff', border: '1.5px solid #E8E8E4', borderRadius: 12,
            boxShadow: '0 12px 36px rgba(17,17,17,0.12), 0 4px 12px rgba(17,17,17,0.06)',
            padding: 8, animation: 'tpSlideDown 0.18s ease-out',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            <div ref={hourColRef} style={colStyle}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-active={parsed?.h === h}
                  style={itemStyle(parsed?.h === h)}
                  onClick={() => setHour(h)}
                  onMouseEnter={(e) => { if (parsed?.h !== h) e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
                  onMouseLeave={(e) => { if (parsed?.h !== h) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div ref={minColRef} style={colStyle}>
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-active={parsed?.m === m}
                  style={itemStyle(parsed?.m === m)}
                  onClick={() => setMinute(m)}
                  onMouseEnter={(e) => { if (parsed?.m !== m) e.currentTarget.style.backgroundColor = '#F7F8FC'; }}
                  onMouseLeave={(e) => { if (parsed?.m !== m) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid #F0F0EC' }}>
            <button
              type="button"
              onClick={() => { const n = new Date(); setHour(n.getHours()); setTimeout(() => setMinute(Math.round(n.getMinutes() / 5) * 5 % 60), 0); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#374151', padding: '4px 6px', borderRadius: 6 }}
            >
              Now
            </button>
            {parsed && (
              <button
                type="button"
                onClick={clearVal}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#DC2626', padding: '4px 6px', borderRadius: 6 }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={close}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#FFC107', padding: '4px 6px', borderRadius: 6 }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tpSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default TimePicker;
