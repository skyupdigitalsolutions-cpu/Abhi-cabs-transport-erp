export default function Switch({ checked, onChange, label, id }) {
  const switchId = id || `switch-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={switchId} className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          id={switchId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <div
          className="w-10 h-6 rounded-full transition-colors"
          style={{ backgroundColor: checked ? '#3B65DB' : '#E5E7EB' }}
        />
        <div
          className="absolute top-1 w-4 h-4 rounded-full transition-transform shadow-sm"
          style={{
            backgroundColor: '#ffffff',
            left: '4px',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </div>
      {label && <span className="text-sm font-medium" style={{ color: '#1F2937' }}>{label}</span>}
    </label>
  );
}
