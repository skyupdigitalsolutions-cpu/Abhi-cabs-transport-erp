import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import Input from './Input';
import { customRange, formatRangeLabel, startOfDaysAgo } from '../../utils/dateRange';

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
  // Presets are calendar days ending now, counted from midnight: "Last 7 Days" is
  // today plus the six days before it. (It used to be a rolling 7 x 24 hours,
  // which starts partway through a day and dropped that day's earlier records.)
  if (key === 'today') return { from: startOfDaysAgo(0).toISOString(),  to: now.toISOString() };
  if (key === '7d')    return { from: startOfDaysAgo(6).toISOString(),  to: now.toISOString() };
  if (key === '30d')   return { from: startOfDaysAgo(29).toISOString(), to: now.toISOString() };
  if (key === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  // Custom: both picked days in full, in the admin's own timezone (see utils/dateRange.js).
  if (key === 'custom') return customRange(customFrom, customTo);
  return null;
}

export default function DateRangeFilter({ onChange, label = 'Date range' }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(null);   // the range that is actually APPLIED
  const [panel, setPanel] = useState(null);      // 'custom' while the date boxes are showing
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function apply(key) {
    if (key === 'custom') {
      // Only opens the date boxes. Nothing is applied (and the button does not
      // claim a range) until Apply is pressed.
      setPanel('custom');
      return;
    }
    setPanel(null);
    setPreset(key);
    onChange(presetToRange(key));
    setOpen(false);
  }

  function applyCustom() {
    const range = presetToRange('custom', customFrom, customTo);
    if (!range) return;
    // A reversed pair is swapped by customRange; show the boxes the same way.
    if (customFrom > customTo) { setCustomFrom(customTo); setCustomTo(customFrom); }
    setPreset('custom');
    onChange(range);
    setOpen(false);
  }

  function clear() {
    setPreset(null);
    setPanel(null);
    setCustomFrom('');
    setCustomTo('');
    onChange(null);
    setOpen(false);
  }

  // Say what is applied: the actual dates for a custom range, not just "Custom Range".
  const activeLabel = preset === 'custom'
    ? (formatRangeLabel(customFrom, customTo) || 'Custom Range')
    : preset ? PRESETS.find((p) => p.key === preset)?.label : label;

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
                background: (preset === p.key || panel === p.key) ? '#FFFBEA' : 'transparent',
                fontSize: 12.5, fontWeight: 600, color: '#111111', cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}

          {panel === 'custom' && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0F0EC', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A5A' }}>FROM</label>
              <Input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12.5 }} />
              <label style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A5A', marginTop: 2 }}>TO</label>
              <Input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)}
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
