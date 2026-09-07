import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const VARIANT_STYLES = {
  primary:   { backgroundColor: '#FFC107', color: '#111111', border: 'none' },
  secondary: { backgroundColor: '#fff', color: '#111111', border: '1.5px solid #E8E8E4' },
  dark:      { backgroundColor: '#111111', color: '#ffffff', border: 'none' },
  danger:    { backgroundColor: '#DC2626', color: '#fff', border: 'none' },
  ghost:     { backgroundColor: 'transparent', color: '#5A5A5A', border: 'none' },
};

const VARIANT_HOVER = {
  primary:   'hover:opacity-90',
  secondary: 'hover:bg-gray-50',
  dark:      'hover:opacity-85',
  danger:    'hover:opacity-90',
  ghost:     'hover:bg-gray-100',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-xs px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  icon: Icon, iconRight: IconRight, className, children, type = 'button', style: externalStyle, ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-bold tracking-wide transition-all focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_HOVER[variant], SIZES[size], className
      )}
      style={{ ...VARIANT_STYLES[variant], ...externalStyle }}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={15} /> : Icon ? <Icon size={15} /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={15} /> : null}
    </button>
  );
}
