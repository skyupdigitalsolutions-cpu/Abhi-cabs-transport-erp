/**
 * ABHI CABS — Donut chart with brand-aligned palette.
 * Lead colour is brand yellow #FFC107, rest follows a complementary palette.
 */
const PALETTE = ['#FFC107', '#111111', '#22A65A', '#7c3aed', '#DC2626', '#9A9A9A'];

export default function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const radius = size / 2;
  const stroke = size * 0.18;
  const r = radius - stroke / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          <circle cx={radius} cy={radius} r={r} fill="none" stroke="#F5F5F3" strokeWidth={stroke} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circumference;
            const offset = cumulative * circumference;
            cumulative += frac;
            return (
              <circle
                key={i}
                cx={radius} cy={radius} r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
      </svg>
      <ul className="space-y-2 text-[12.5px]">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="font-semibold" style={{ color: '#111111' }}>{d.label}</span>
            <span className="font-medium" style={{ color: '#9A9A9A' }}>({d.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
