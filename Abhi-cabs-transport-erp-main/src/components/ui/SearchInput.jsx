import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6B7280' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border pl-9 pr-8 py-2 text-sm focus-ring"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#E5E7EB',
          color: '#1F2937',
          outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 focus-ring rounded"
          aria-label="Clear search"
          style={{ color: '#6B7280' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
