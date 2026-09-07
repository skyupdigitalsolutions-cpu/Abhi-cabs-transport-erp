import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn('w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-ring', className)}
      style={{
        backgroundColor: props.disabled ? '#F5F5F3' : '#ffffff',
        color: props.disabled ? '#9A9A9A' : '#111111',
        borderColor: error ? '#DC2626' : '#E8E8E4',
        cursor: props.disabled ? 'not-allowed' : undefined,
        outline: 'none',
      }}
      {...props}
    />
  );
});

export default Input;
