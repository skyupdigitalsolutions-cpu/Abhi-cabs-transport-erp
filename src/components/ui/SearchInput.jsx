import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Polished SearchInput — branded focus ring, smooth icon transitions.
 * API unchanged: { value, onChange, placeholder, className }
 */
export default function SearchInput({ value, onChange, placeholder = 'Search…', className, style: externalStyle }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn('relative', className)} style={externalStyle}>
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          color: focused ? '#FFC107' : '#9A9A9A',
          transition: 'color 0.2s',
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%', borderRadius: 10,
          border: `1.5px solid ${focused ? '#FFC107' : '#E8E8E4'}`,
          padding: '9px 32px 9px 36px',
          fontSize: 13.5, fontWeight: 500,
          backgroundColor: '#ffffff', color: '#111111',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md"
          aria-label="Clear search"
          style={{
            color: '#9A9A9A', padding: 2,
            display: 'grid', placeItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#111'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9A9A9A'; }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
