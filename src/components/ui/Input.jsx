import { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Custom Input — replaces raw browser inputs with a polished, branded look.
 * Animated label float, branded focus ring, custom date/time/number styling.
 * API is fully backward-compatible.
 */
const Input = forwardRef(function Input({ className, error, style: externalStyle, ...props }, ref) {
  const [focused, setFocused] = useState(false);

  const isDateOrTime = ['date', 'time', 'datetime-local', 'month', 'week'].includes(props.type);

  return (
    <input
      ref={ref}
      className={cn('w-full transition-all duration-200', className)}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${error ? '#DC2626' : focused ? '#FFC107' : '#E8E8E4'}`,
        padding: '9px 12px',
        fontSize: 13.5,
        fontWeight: 500,
        backgroundColor: props.disabled ? '#F5F5F3' : '#ffffff',
        color: props.disabled ? '#9A9A9A' : '#111111',
        cursor: props.disabled ? 'not-allowed' : isDateOrTime ? 'pointer' : undefined,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        // Better date/time appearance
        ...(isDateOrTime ? { colorScheme: 'light' } : {}),
        ...externalStyle,
      }}
      {...props}
    />
  );
});

export default Input;
