import { forwardRef } from 'react';

const Select = forwardRef(function Select({ error, options = [], placeholder, style, onChange, value, ...props }, ref) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        style={{
          width: '100%', appearance: 'none', borderRadius: 8,
          border: `1.5px solid ${error ? '#DC2626' : '#E8E8E4'}`,
          padding: '7px 32px 7px 10px', fontSize: 13.5, fontWeight: 500,
          backgroundColor: '#ffffff', color: '#111111', cursor: 'pointer',
          outline: 'none',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <svg style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9A9A9A' }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
});

export default Select;
