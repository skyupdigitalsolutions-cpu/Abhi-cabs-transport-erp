import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const TYPES = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', Icon: Info },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', Icon: CheckCircle },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', Icon: AlertTriangle },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', Icon: XCircle },
};

export default function Alert({ type = 'info', children, className, style }) {
  const { bg, border, color, Icon } = TYPES[type] || TYPES.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      borderRadius: 12, padding: '10px 14px', fontSize: 12, fontWeight: 500,
      backgroundColor: bg, border: `1px solid ${border}`, color,
      ...style,
    }}>
      <Icon size={15} style={{ flexShrink: 0, marginTop: 1, color }} />
      <div>{children}</div>
    </div>
  );
}
