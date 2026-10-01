/** StatusBadge — MUI <Chip> with a coloured status dot. */
import Chip from '@mui/material/Chip';
import { titleCase } from '../../utils/formatters';
import { STATUS_COLORS } from '../../constants';

const COLORS = {
  green:  { bg: '#f0fdf4', color: '#22A65A', border: '#bbf7d0' },
  red:    { bg: '#fef2f2', color: '#DC2626', border: '#fecaca' },
  amber:  { bg: '#fff8e1', color: '#b45309', border: '#FFC107' },
  blue:   { bg: '#eff6ff', color: '#2563EB', border: '#bfdbfe' },
  purple: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  slate:  { bg: '#F5F5F3', color: '#5A5A5A', border: '#E8E8E4' },
};

export default function StatusBadge({ status, className }) {
  const c = COLORS[STATUS_COLORS[String(status || '').toUpperCase()] || 'slate'];
  return (
    <Chip
      size="small"
      className={className}
      icon={<span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.color, marginLeft: 8 }} />}
      label={titleCase(status || 'unknown')}
      sx={{ bgcolor: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'uppercase' }}
    />
  );
}
