import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select({ className, error, options = [], placeholder, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-xs font-medium transition-colors focus-ring cursor-pointer',
          className
        )}
        style={{
          backgroundColor: '#ffffff',
          color: '#111111',
          borderColor: error ? '#DC2626' : '#E8E8E4',
          outline: 'none',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: '#9A9A9A' }} />
    </div>
  );
});

export default Select;
