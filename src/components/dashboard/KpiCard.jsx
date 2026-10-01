/** KpiCard — MUI <Card> stat tile with an icon avatar and trend chip. */
import MuiCard from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
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
  const positive = delta >= 0;
  const t = TONES[tone] || TONES.primary;
  return (
    <MuiCard sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2,
      '&:hover': { boxShadow: '0 10px 28px rgba(17,17,17,.08)', transform: 'translateY(-2px)' } }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#8A8A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 900, marginTop: 6, color: '#111', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11.5, marginTop: 6, fontWeight: 500, color: '#9A9A9A' }}>{sub}</p>}
        {delta !== undefined && (
          <Chip
            size="small"
            icon={positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            label={`${Math.abs(delta)}% vs last week`}
            sx={{ mt: 1, bgcolor: positive ? '#f0fdf4' : '#fef2f2', color: positive ? '#15803d' : '#DC2626', '& .MuiChip-icon': { color: 'inherit' } }}
          />
        )}
      </div>
      {Icon && (
        <Avatar variant="rounded" sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: t.bg, color: t.color }}>
          <Icon size={19} strokeWidth={2.5} />
        </Avatar>
      )}
    </MuiCard>
  );
}
