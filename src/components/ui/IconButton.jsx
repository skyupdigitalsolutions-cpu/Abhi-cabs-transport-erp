import { cn } from '../../utils/cn';

const SIZE_MAP = { sm: 28, md: 36, lg: 44 };

export default function IconButton({ icon: Icon, label, className, variant = 'ghost', size = 'md', ...props }) {
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] || SIZE_MAP.md);
  const styles = {
    ghost:   { color: '#6B7280', hoverBg: '#F3F4F6', hoverColor: '#111' },
    danger:  { color: '#EF4444', hoverBg: '#fef2f2', hoverColor: '#DC2626' },
    primary: { color: '#B8860B', hoverBg: '#FFFBEB', hoverColor: '#111' },
  };
  const s = styles[variant] || styles.ghost;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex items-center justify-center rounded-[10px] focus-ring', className)}
      style={{
        height: px, width: px, color: s.color, flexShrink: 0,
        transition: 'background-color 0.18s, color 0.18s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = s.hoverBg;
        e.currentTarget.style.color = s.hoverColor;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.style.color = s.color;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      {...props}
    >
      <Icon size={Math.round(px * 0.44)} />
    </button>
  );
}
