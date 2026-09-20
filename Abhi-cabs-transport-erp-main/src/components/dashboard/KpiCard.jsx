import Card from '../ui/Card';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const TONES = {
  primary: { bg: '#FFC107', color: '#111111' },
  accent:  { bg: '#111111', color: '#FFC107' },
  green:   { bg: '#f0fdf4', color: '#22A65A' },
  purple:  { bg: '#f5f3ff', color: '#7c3aed' },
  blue:    { bg: '#eff6ff', color: '#2563EB' },
  amber:   { bg: '#fffbeb', color: '#92400e' },
  red:     { bg: '#fef2f2', color: '#DC2626' },
};

export default function KpiCard({ label, value, sub, delta, icon: Icon, tone = 'primary' }) {
  const positive   = delta >= 0;
  const iconStyle  = TONES[tone] || TONES.primary;

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-bold uppercase tracking-widest truncate" style={{ color: '#9A9A9A' }}>
          {label}
        </p>
        <p className="text-2xl font-extrabold mt-1 tracking-tight leading-none" style={{ color: '#111111', letterSpacing: '-0.5px' }}>
          {value}
        </p>
        {sub && (
          <p className="text-[11.5px] mt-1 font-medium" style={{ color: '#9A9A9A' }}>{sub}</p>
        )}
        {delta !== undefined && (
          <p className="flex items-center gap-0.5 text-[11.5px] mt-1.5 font-bold"
            style={{ color: positive ? '#22A65A' : '#DC2626' }}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta)}% vs last week
          </p>
        )}
      </div>
      {Icon && (
        <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
          style={{ backgroundColor: iconStyle.bg }}>
          <Icon size={18} style={{ color: iconStyle.color }} strokeWidth={2.5} />
        </div>
      )}
    </Card>
  );
}
