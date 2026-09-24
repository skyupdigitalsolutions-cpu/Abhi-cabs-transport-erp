import { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Polished Textarea — branded focus ring, smooth transitions.
 * API unchanged: { className, error, rows, ...rest }
 */
const Textarea = forwardRef(function Textarea({ className, error, rows = 4, style: externalStyle, ...props }, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('w-full resize-y', className)}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${error ? '#EF4444' : focused ? '#FFC107' : '#E8E8E4'}`,
        padding: '9px 12px',
        fontSize: 13.5,
        fontWeight: 500,
        backgroundColor: '#ffffff',
        color: '#1F2937',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...externalStyle,
      }}
      {...props}
    />
  );
});

export default Textarea;
