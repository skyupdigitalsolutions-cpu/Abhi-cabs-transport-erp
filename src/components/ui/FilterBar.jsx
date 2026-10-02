import { X } from 'lucide-react';
import Paper from '@mui/material/Paper';
import Button from './Button';
import SearchInput from './SearchInput';
import Select from './Select';

/**
 * FilterBar — search + a row of filter dropdowns inside an attractive,
 * card-like surface. Custom Select underneath means no native browser
 * <select> popups. A one-click "Clear" appears while anything is narrowing the
 * list.
 *
 * Props:
 *   filters[i].ignoreActive  true for controls that ORDER the list (sort by /
 *                            order) rather than narrow it — they never count as
 *                            "a filter is on", so they don't show Clear.
 *   extraActive              true when something in `extra` (e.g. a date range)
 *                            is narrowing the list.
 *   onClear                  resets EVERYTHING the page owns (search, filters,
 *                            extra controls, sort). Without it, Clear resets the
 *                            filters and the search box.
 */
export default function FilterBar({
  search, onSearchChange, searchPlaceholder,
  filters = [], extra, extraActive = false, onClear, className = '',
}) {
  // Only things that NARROW the list count — a default sort is not a filter.
  const narrowing = filters.filter((f) => !f.ignoreActive && f.value && f.value !== '').length;
  const hasSearch = typeof search === 'string' && search.trim() !== '';
  const anyActive = narrowing > 0 || hasSearch || Boolean(extraActive);
  const clearAll = () => {
    if (onClear) { onClear(); return; }
    filters.forEach((f) => { if (!f.ignoreActive && f.value) f.onChange(''); });
    if (hasSearch) onSearchChange?.('');
  };

  return (
    <Paper
      variant="outlined"
      className={className}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2, p: 1.5, borderRadius: 0, bgcolor: '#FFFFFF' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
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

        {anyActive && (
          <Button variant="dangerOutline" size="sm" icon={X} onClick={clearAll} style={{ height: 38 }}>
            Clear
          </Button>
        )}
      </div>

      {extra && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {extra}
        </div>
      )}
    </Paper>
  );
}
