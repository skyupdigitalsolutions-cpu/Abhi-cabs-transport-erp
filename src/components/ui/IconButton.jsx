import { cn } from '../../utils/cn';

export default function IconButton({ icon: Icon, label, className, variant = 'ghost', ...props }) {
  const styles = {
    ghost:  { color: '#6B7280' },
    danger: { color: '#EF4444' },
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors focus-ring', className)}
      style={styles[variant]}
      onMouseEnter={(e) => {
        if (variant === 'danger') e.currentTarget.style.backgroundColor = '#fef2f2';
        else e.currentTarget.style.backgroundColor = '#F7F8FC';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
      {...props}
    >
      <Icon size={17} />
    </button>
  );
}
