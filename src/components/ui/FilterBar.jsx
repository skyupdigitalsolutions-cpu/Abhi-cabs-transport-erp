import { X } from 'lucide-react';
import SearchInput from './SearchInput';
import Select from './Select';

export default function FilterBar({
  search, onSearchChange, searchPlaceholder,
  filters = [], extra, className = '',
}) {
  const hasActiveFilters = filters.some((f) => f.value && f.value !== '');
  const clearAll = () => filters.forEach((f) => { if (f.value) f.onChange(''); });

  return (
    <div className={`flex flex-col gap-2 mb-4 ${className}`}>
      <div className="flex flex-wrap gap-2 items-center">
        {onSearchChange && (
          <SearchInput value={search} onChange={onSearchChange}
            placeholder={searchPlaceholder} className="sm:max-w-xs" />
        )}
        {filters.map((f) => (
          <Select key={f.name} value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            options={f.options} placeholder={f.placeholder} className="sm:w-44" />
        ))}
        {hasActiveFilters && (
          <button onClick={clearAll}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg"
            style={{ color: '#EF4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>
      {extra && <div className="flex flex-wrap gap-2 items-center">{extra}</div>}
    </div>
  );
}
