import { cn } from '../../utils/cn';

export default function FormField({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: '#1F2937' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs" role="alert" style={{ color: '#EF4444' }}>{error}</p>
      ) : hint ? (
        <p className="text-xs" style={{ color: '#6B7280' }}>{hint}</p>
      ) : null}
    </div>
  );
}
