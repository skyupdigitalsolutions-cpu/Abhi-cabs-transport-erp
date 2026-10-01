/** Badge — MUI <Chip> pill. Same props: tone, children, style, className. */
import Chip from '@mui/material/Chip';

const TONES = {
  slate:   { bg: '#F5F5F3', color: '#5A5A5A', border: '#E8E8E4' },
  primary: { bg: '#fff8e1', color: '#b45309', border: '#FFC107' },
  yellow:  { bg: '#FFC107', color: '#111111', border: '#FFC107' },
  red:     { bg: '#fef2f2', color: '#DC2626', border: '#fecaca' },
  green:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  blue:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  amber:   { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  purple:  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  orange:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
};

export default function Badge({ children, tone = 'slate', className, style }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <Chip
      size="small"
      label={children}
      className={className}
      style={style}
      sx={{ bgcolor: t.bg, color: t.color, border: `1px solid ${t.border}`, textTransform: 'uppercase', maxWidth: '100%' }}
    />
  );
}
