import { cn } from '../../utils/cn';

/**
 * FormField — wrapper for form labels, errors, and hints.
 * Upgraded with better typography and spacing.
 */
export default function FormField({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 13, fontWeight: 700, color: '#374151',
            letterSpacing: '0.01em',
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#FFC107', marginLeft: 3, fontWeight: 800 }}>*</span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          role="alert"
          style={{
            fontSize: 12, fontWeight: 600, color: '#EF4444',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 14, height: 14, borderRadius: '50%',
            backgroundColor: '#FEF2F2', fontSize: 10, fontWeight: 800,
          }}>!</span>
          {error}
        </p>
      ) : hint ? (
        <p style={{ fontSize: 12, fontWeight: 500, color: '#9A9A9A' }}>{hint}</p>
      ) : null}
    </div>
  );
}
