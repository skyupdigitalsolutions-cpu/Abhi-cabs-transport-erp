import { SlidersHorizontal, X } from 'lucide-react';
import SearchInput from './SearchInput';
import Select from './Select';

/**
 * FilterBar — search + a row of filter dropdowns inside an attractive,
 * card-like surface. Custom Select underneath means no native browser
 * <select> popups; the active-filter count badge and one-click "Clear"
 * make it obvious at a glance what's currently narrowing the list.
 */
export default function FilterBar({
  search, onSearchChange, searchPlaceholder,
  filters = [], extra, className = '',
}) {
  const activeCount = filters.filter((f) => f.value && f.value !== '').length;
  const clearAll = () => filters.forEach((f) => { if (f.value) f.onChange(''); });

  return (
    <div
      className={className}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16,
        padding: 12, borderRadius: 14,
        backgroundColor: '#FAFAF8', border: '1px solid #EEEEE9',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {filters.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, color: '#5A5A5A', whiteSpace: 'nowrap',
          }}>
            <SlidersHorizontal size={14} style={{ color: '#9A9A9A' }} />
            Filters
            {activeCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px',
                backgroundColor: '#FFC107', color: '#111111', fontSize: 10.5, fontWeight: 800,
              }}>
                {activeCount}
              </span>
            )}
          </div>
        )}

        {onSearchChange && (
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            style={{ maxWidth: 280, flex: '1 1 200px' }}
          />
        )}

        {filters.map((f) => (
          <Select
            key={f.name}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            options={f.options}
            placeholder={f.placeholder}
            style={{ minWidth: 170 }}
          />
        ))}

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12.5, fontWeight: 700, padding: '9px 12px', borderRadius: 10,
              color: '#DC2626', backgroundColor: '#fef2f2',
              border: '1.5px solid #fecaca', cursor: 'pointer',
              height: 38, whiteSpace: 'nowrap',
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#DC2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
          >
            <X size={13} strokeWidth={3} />
            Clear
          </button>
        )}
      </div>

      {extra && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {extra}
        </div>
      )}
    </div>
  );
}
