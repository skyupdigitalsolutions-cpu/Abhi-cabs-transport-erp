import { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input({ className, error, style: externalStyle, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const isDateOrTime = ['date', 'time', 'datetime-local', 'month', 'week'].includes(rest.type);

  return (
    <input
      ref={ref}
      className={cn('w-full transition-all duration-200', className)}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${error ? '#DC2626' : focused ? '#FFC107' : '#E8E8E4'}`,
        padding: '9px 12px',
        fontSize: 13.5,
        fontWeight: 500,
        backgroundColor: rest.disabled ? '#F5F5F3' : '#ffffff',
        color: rest.disabled ? '#9A9A9A' : '#111111',
        cursor: rest.disabled ? 'not-allowed' : isDateOrTime ? 'pointer' : undefined,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...(isDateOrTime ? { colorScheme: 'light' } : {}),
        ...externalStyle,
      }}
      {...rest}
    />
  );
});

export default Input;
