import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';

/**
 * Password Input — show/hide toggle with polished icon button.
 * API unchanged.
 */
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Input
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        {...props}
        style={{ paddingRight: 40, ...(props.style || {}) }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)',
          display: 'grid', placeItems: 'center',
          padding: 4, borderRadius: 6,
          border: 'none', background: 'none',
          color: '#9A9A9A', cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#111'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#9A9A9A'; }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
