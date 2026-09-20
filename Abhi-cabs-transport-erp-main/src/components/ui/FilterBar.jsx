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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
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
            style={{ minWidth: 160 }}
          />
        ))}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8,
              color: '#DC2626', backgroundColor: '#fef2f2',
              border: '1px solid #fecaca', cursor: 'pointer',
            }}
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
