import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:      { backgroundColor: '#FFC107', color: '#111111', border: 'none' },
  secondary:    { backgroundColor: '#ffffff', color: '#111111', border: '1.5px solid #E8E8E4' },
  dark:         { backgroundColor: '#111111', color: '#ffffff', border: 'none' },
  danger:       { backgroundColor: '#DC2626', color: '#ffffff', border: 'none' },
  dangerOutline:{ backgroundColor: '#fef2f2', color: '#DC2626', border: '1.5px solid #fecaca' },
  ghost:        { backgroundColor: 'transparent', color: '#5A5A5A', border: 'none' },
};

const SIZES = {
  sm: { fontSize: 11, padding: '6px 12px', gap: 5 },
  md: { fontSize: 12, padding: '8px 16px', gap: 6 },
  lg: { fontSize: 13, padding: '10px 20px', gap: 6 },
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  icon: Icon, iconRight: IconRight, className, children, type = 'button',
  style: externalStyle, onClick, ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const s = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, borderRadius: 8, fontWeight: 800, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.5 : 1, transition: 'opacity 0.15s',
        fontSize: s.fontSize, padding: s.padding,
        ...v, ...externalStyle,
      }}
      {...props}
    >
      {loading ? <Loader2 size={14} style={{ animation: 'btn-spin 0.8s linear infinite' }} /> : Icon ? <Icon size={14} /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={14} /> : null}
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
