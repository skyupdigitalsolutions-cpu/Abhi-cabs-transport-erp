import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const TYPES = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', Icon: Info },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', Icon: CheckCircle },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', Icon: AlertTriangle },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', Icon: XCircle },
};

export default function Alert({ type = 'info', children, className }) {
  const { bg, border, color, Icon } = TYPES[type] || TYPES.info;
  return (
    <div
      className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-xs font-medium', className)}
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
    >
      <Icon size={15} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
