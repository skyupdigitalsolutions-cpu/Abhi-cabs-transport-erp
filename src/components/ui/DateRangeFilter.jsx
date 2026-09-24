import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import Input from './Input';

/**
 * DateRangeFilter — a dropdown with quick presets (Today / This Week / This
 * Month / Last 30 Days) plus a genuine custom From–To range, matching the
 * pattern Reports.jsx already used. Calls onChange({ from, to } | null) with
 * ISO datetime strings, or null when cleared — ready to pass straight into
 * an API call's query params.
 *
 * IMPORTANT: only wire this into a page whose backend endpoint actually
 * accepts `from`/`to` query params. Confirmed supported today: bookings
 * (GET /admin/bookings), payments (GET /admin/payments), reports. NOT
 * supported: drivers, vehicles, customers, contacts/support, invoices — the
 * backend validators for those have no date fields at all, so a filter here
 * would silently do nothing (or worse, only filter the current page's
 * already-fetched rows, which is misleading). Don't add this component to
 * those pages until/unless that backend support exists.
 */
const PRESETS = [
  { key: 'today',   label: 'Today' },
  { key: '7d',      label: 'Last 7 Days' },
  { key: '30d',     label: 'Last 30 Days' },
  { key: 'month',   label: 'This Month' },
  { key: 'custom',  label: 'Custom Range…' },
];

function presetToRange(key, customFrom, customTo) {
  const now = new Date();
  if (key === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (key === '7d')  return { from: new Date(now - 7  * 86400000).toISOString(), to: now.toISOString() };
  if (key === '30d') return { from: new Date(now - 30 * 86400000).toISOString(), to: now.toISOString() };
  if (key === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (key === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() };
  }
  return null;
}

export default function DateRangeFilter({ onChange, label = 'Date range' }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function apply(key) {
    setPreset(key);
    if (key !== 'custom') {
      onChange(presetToRange(key));
      setOpen(false);
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    onChange(presetToRange('custom', customFrom, customTo));
    setOpen(false);
  }

  function clear() {
    setPreset(null);
    setCustomFrom('');
    setCustomTo('');
    onChange(null);
    setOpen(false);
  }

  const activeLabel = preset ? PRESETS.find((p) => p.key === preset)?.label : label;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8,
          border: preset ? '1px solid #FFC107' : '1px solid #E8E8E4',
          backgroundColor: preset ? '#FFFBEA' : '#fff',
          color: '#111111', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <Calendar size={13} />
        {activeLabel}
        {preset && (
          <span onClick={(e) => { e.stopPropagation(); clear(); }} style={{ display: 'flex', marginLeft: 2 }}>
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 30,
          backgroundColor: '#fff', border: '1px solid #E8E8E4', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 10, minWidth: 200,
        }}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => apply(p.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 8px', borderRadius: 6, border: 'none',
                background: preset === p.key ? '#FFFBEA' : 'transparent',
                fontSize: 12.5, fontWeight: 600, color: '#111111', cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0F0EC', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A5A' }}>FROM</label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12.5 }} />
              <label style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A5A', marginTop: 2 }}>TO</label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12.5 }} />
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                style={{
                  marginTop: 6, padding: '6px 10px', borderRadius: 6, border: 'none',
                  backgroundColor: '#FFC107', color: '#111111', fontWeight: 700, fontSize: 13.5,
                  cursor: customFrom && customTo ? 'pointer' : 'not-allowed',
                  opacity: customFrom && customTo ? 1 : 0.5,
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
