import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea({ className, error, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('w-full rounded-lg border px-3 py-2 text-sm resize-y transition-colors focus-ring', className)}
      style={{
        backgroundColor: '#ffffff',
        color: '#1F2937',
        borderColor: error ? '#EF4444' : '#E5E7EB',
        outline: 'none',
      }}
      {...props}
    />
  );
});

export default Textarea;
