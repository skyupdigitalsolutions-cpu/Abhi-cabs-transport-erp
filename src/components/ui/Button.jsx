import { Loader2 } from 'lucide-react';

// ABHI CABS ERP — polished, consistent button system.
// Fixed heights per size guarantee every button lines up; stronger font
// weight + shadows + hover lift make them feel tactile and premium.

const VARIANTS = {
  primary: {
    base:  { backgroundColor: '#FFC107', color: '#111111', border: 'none', boxShadow: '0 2px 8px rgba(255,193,7,0.35)' },
    hover: { backgroundColor: '#E6AC00', boxShadow: '0 6px 18px rgba(255,193,7,0.45)' },
  },
  secondary: {
    base:  { backgroundColor: '#ffffff', color: '#111111', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 2px rgba(17,17,17,0.04)' },
    hover: { backgroundColor: '#FAFAFA', border: '1.5px solid #111111' },
  },
  outline: {
    base:  { backgroundColor: '#ffffff', color: '#111111', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 2px rgba(17,17,17,0.04)' },
    hover: { backgroundColor: '#FFFBEB', border: '1.5px solid #FFC107', color: '#111' },
  },
  dark: {
    base:  { backgroundColor: '#111111', color: '#ffffff', border: 'none', boxShadow: '0 2px 8px rgba(17,17,17,0.2)' },
    hover: { backgroundColor: '#000000', boxShadow: '0 6px 18px rgba(17,17,17,0.3)' },
  },
  danger: {
    base:  { backgroundColor: '#DC2626', color: '#ffffff', border: 'none', boxShadow: '0 2px 8px rgba(220,38,38,0.28)' },
    hover: { backgroundColor: '#B91C1C', boxShadow: '0 6px 18px rgba(220,38,38,0.38)' },
  },
  dangerOutline: {
    base:  { backgroundColor: '#fff', color: '#DC2626', border: '1.5px solid #fecaca' },
    hover: { backgroundColor: '#fef2f2', border: '1.5px solid #DC2626' },
  },
  success: {
    base:  { backgroundColor: '#16A34A', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(22,163,74,0.28)' },
    hover: { backgroundColor: '#15803D', boxShadow: '0 6px 18px rgba(22,163,74,0.38)' },
  },
  ghost: {
    base:  { backgroundColor: 'transparent', color: '#5A5A5A', border: 'none' },
    hover: { backgroundColor: '#F3F4F6', color: '#111' },
  },
};

// Fixed heights → perfectly consistent alignment everywhere.
const SIZES = {
  sm: { height: 34, fontSize: 13,   padding: '0 14px', gap: 6,  icon: 15 },
  md: { height: 40, fontSize: 14,   padding: '0 18px', gap: 7,  icon: 16 },
  lg: { height: 46, fontSize: 15,   padding: '0 24px', gap: 8,  icon: 18 },
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  icon: Icon, iconRight: IconRight, block = false,
  className, children, type = 'button', style: externalStyle, onClick, ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, height: s.height, padding: s.padding, borderRadius: 10,
        fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1,
        fontSize: s.fontSize, whiteSpace: 'nowrap',
        width: block ? '100%' : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
        ...v.base,
        ...externalStyle,
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, v.hover);
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, v.base, externalStyle || {});
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(0) scale(0.97)'; }}
      onMouseUp={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-1px) scale(1)'; }}
      {...props}
    >
      {loading ? <Loader2 size={s.icon} style={{ animation: 'btn-spin 0.8s linear infinite' }} /> : Icon ? <Icon size={s.icon} /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={s.icon} /> : null}
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}