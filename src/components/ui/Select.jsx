import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select({ className, error, options = [], placeholder, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-sm transition-colors focus-ring', className)}
        style={{
          backgroundColor: '#ffffff',
          color: '#1F2937',
          borderColor: error ? '#EF4444' : '#E5E7EB',
          outline: 'none',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
    </div>
  );
});

export default Select;
