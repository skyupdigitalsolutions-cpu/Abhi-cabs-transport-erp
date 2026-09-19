const TONES = {
  slate:   { backgroundColor: '#F5F5F3', color: '#5A5A5A', border: '1px solid #E8E8E4' },
  primary: { backgroundColor: '#fff8e1', color: '#b45309', border: '1px solid #FFC107' },
  yellow:  { backgroundColor: '#FFC107', color: '#111111', border: 'none' },
  red:     { backgroundColor: '#fef2f2', color: '#DC2626', border: '1px solid #fecaca' },
  green:   { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  blue:    { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  amber:   { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  purple:  { backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' },
  orange:  { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
};

export default function Badge({ children, tone = 'slate', className, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', borderRadius: 6,
      padding: '2px 7px', fontSize: 11.5, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
      ...(TONES[tone] || TONES.slate),
      ...style,
    }}>
      {children}
    </span>
  );
}
