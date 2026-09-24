import SearchInput from './SearchInput';
import Select from './Select';

export default function FilterBar({
  search, onSearchChange, searchPlaceholder,
  filters = [], extra, className = '',
}) {
  const hasActiveFilters = filters.some((f) => f.value && f.value !== '');
  const clearAll = () => filters.forEach((f) => { if (f.value) f.onChange(''); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {onSearchChange && (
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            style={{ maxWidth: 280 }}
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
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12.5, fontWeight: 700, padding: '9px 12px', borderRadius: 10,
              color: '#DC2626', backgroundColor: '#fef2f2',
              border: '1.5px solid #fecaca', cursor: 'pointer',
              height: 38,
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#DC2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
          >
            ✕ Clear
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
