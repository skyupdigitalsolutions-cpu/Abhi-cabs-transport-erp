/**
 * Custom Switch — premium toggle with smooth animation, no native checkbox.
 * API unchanged: { checked, onChange, label, id, disabled }
 */
export default function Switch({ checked, onChange, label, id, disabled }) {
  const switchId = id || `switch-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label
      htmlFor={switchId}
      className="flex items-center gap-3"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          id={switchId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
        <div
          style={{
            width: 44, height: 24, borderRadius: 12,
            backgroundColor: checked ? '#FFC107' : '#E5E7EB',
            boxShadow: checked
              ? 'inset 0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(255,193,7,0.25)'
              : 'inset 0 1px 3px rgba(0,0,0,0.08)',
            transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
          }}
        />
        <div
          style={{
            position: 'absolute', top: 2, left: 2,
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.06)',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937' }}>
          {label}
        </span>
      )}
    </label>
  );
}
