import { cn } from '../../utils/cn';

const TONES = {
  slate:   { backgroundColor: '#F5F5F3', color: '#5A5A5A', border: '1px solid #E8E8E4' },
  primary: { backgroundColor: '#fff8e1', color: '#b45309', border: '1px solid #FFC107' },
  accent:  { backgroundColor: '#fff8e1', color: '#b45309', border: '1px solid #fde68a' },
  yellow:  { backgroundColor: '#FFC107', color: '#111111', border: 'none' },
  red:     { backgroundColor: '#fef2f2', color: '#DC2626', border: '1px solid #fecaca' },
  green:   { backgroundColor: '#f0fdf4', color: '#22A65A', border: '1px solid #bbf7d0' },
  blue:    { backgroundColor: '#eff6ff', color: '#2563EB', border: '1px solid #bfdbfe' },
  amber:   { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  purple:  { backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
  orange:  { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
};

export default function Badge({ children, tone = 'slate', className, style }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold capitalize tracking-wide uppercase whitespace-nowrap',
        className
      )}
      style={{ ...TONES[tone] || TONES.slate, ...style }}
    >
      {children}
    </span>
  );
}
