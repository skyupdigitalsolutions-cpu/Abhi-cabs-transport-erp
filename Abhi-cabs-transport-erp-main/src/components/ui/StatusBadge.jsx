import { cn } from '../../utils/cn';
import { titleCase } from '../../utils/formatters';
import { STATUS_COLORS } from '../../constants';

const COLOR_STYLES = {
  green:  { backgroundColor: '#f0fdf4', color: '#22A65A', borderColor: '#bbf7d0' },
  red:    { backgroundColor: '#fef2f2', color: '#DC2626', borderColor: '#fecaca' },
  amber:  { backgroundColor: '#fff8e1', color: '#b45309', borderColor: '#FFC107' },
  blue:   { backgroundColor: '#eff6ff', color: '#2563EB', borderColor: '#bfdbfe' },
  purple: { backgroundColor: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' },
  slate:  { backgroundColor: '#F5F5F3', color: '#5A5A5A', borderColor: '#E8E8E4' },
};

export default function StatusBadge({ status, className }) {
  const color = STATUS_COLORS[String(status || '').toUpperCase()] || 'slate';
  const style = COLOR_STYLES[color];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap tracking-wide uppercase', className)}
      style={style}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
      {titleCase(status || 'unknown')}
    </span>
  );
}
