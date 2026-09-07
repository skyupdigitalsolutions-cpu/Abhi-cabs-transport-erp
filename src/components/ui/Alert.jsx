import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const CONFIG = {
  info:    { icon: Info,         bg: '#eef2fb', color: '#2F55C7', border: '#c7d7f6' },
  success: { icon: CheckCircle2, bg: '#f0fdf4', color: '#38B763', border: '#bbf7d0' },
  warning: { icon: AlertTriangle,bg: '#fffbeb', color: '#F59E0B', border: '#fde68a' },
  error:   { icon: XCircle,      bg: '#fef2f2', color: '#EF4444', border: '#fecaca' },
};

export default function Alert({ type = 'info', title, children, className }) {
  const { icon: Icon, bg, color, border } = CONFIG[type];
  return (
    <div
      role="alert"
      className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', className)}
      style={{ backgroundColor: bg, borderColor: border, color }}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[13px] opacity-90">{children}</div>}
      </div>
    </div>
  );
}
