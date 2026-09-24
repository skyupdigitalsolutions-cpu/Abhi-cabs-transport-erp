import { Check } from 'lucide-react';

/**
 * Custom Checkbox — no native browser checkbox appearance.
 * Uses a styled div with a check icon for a polished look.
 * API is backward-compatible: { checked, onChange, label, className, disabled, ...rest }
 */
export default function Checkbox({ label, className = '', checked, onChange, disabled, id, ...props }) {
  const checkboxId = id || `cb-${label?.replace(/\s+/g, '-').toLowerCase() || Math.random().toString(36).slice(2)}`;
  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontSize: 13.5, fontWeight: 500, color: '#1F2937',
      }}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <div
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          border: `1.5px solid ${checked ? '#FFC107' : '#D1D5DB'}`,
          backgroundColor: checked ? '#FFC107' : '#ffffff',
          boxShadow: checked
            ? '0 2px 6px rgba(255,193,7,0.3)'
            : '0 1px 2px rgba(17,17,17,0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        {checked && (
          <Check size={13} strokeWidth={3} style={{ color: '#111111' }} />
        )}
      </div>
      {label && <span>{label}</span>}
    </label>
  );
}
