import { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

/**
 * Custom Input — replaces raw browser inputs with a polished, branded look.
 * Animated label float, branded focus ring, custom number styling.
 * `type="date"` and `type="time"` are fully replaced by DatePicker /
 * TimePicker (no native OS/browser calendar or clock popup) — everything
 * else falls through to a styled native <input>.
 * API is fully backward-compatible.
 */
const Input = forwardRef(function Input({ className, error, style: externalStyle, type, ...props }, ref) {
  const [focused, setFocused] = useState(false);

  if (type === 'date') {
    return <DatePicker ref={ref} error={error} style={externalStyle} className={className} {...props} />;
  }
  if (type === 'time') {
    return <TimePicker ref={ref} error={error} style={externalStyle} className={className} {...props} />;
  }

  return (
    <input
      ref={ref}
      type={type}
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
        cursor: props.disabled ? 'not-allowed' : undefined,
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...externalStyle,
      }}
      {...props}
    />
  );
});

export default Input;
