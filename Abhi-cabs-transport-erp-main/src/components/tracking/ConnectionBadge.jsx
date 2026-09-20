const CONFIG = {
  connecting:   { label: 'Connecting…', bg: '#fffbeb', color: '#F59E0B', border: '#fde68a', pulse: true },
  open:         { label: 'Live',        bg: '#f0fdf4', color: '#38B763', border: '#bbf7d0', pulse: false },
  reconnecting: { label: 'Reconnecting…', bg: '#fffbeb', color: '#F59E0B', border: '#fde68a', pulse: true },
  closed:       { label: 'Disconnected', bg: '#fef2f2', color: '#EF4444', border: '#fecaca', pulse: false },
};

export default function ConnectionBadge({ status }) {
  const c = CONFIG[status] || CONFIG.closed;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}
    >
      <span
        className={c.pulse ? 'animate-pulse' : ''}
        style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', backgroundColor: c.color }}
      />
      {c.label}
    </span>
  );
}
