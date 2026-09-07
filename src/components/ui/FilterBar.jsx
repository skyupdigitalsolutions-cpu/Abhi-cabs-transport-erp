import SearchInput from './SearchInput';
import Select from './Select';

export default function FilterBar({ search, onSearchChange, searchPlaceholder, filters = [] }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
      {onSearchChange && <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="sm:max-w-xs" />}
      {filters.map((f) => (
        <Select key={f.name} value={f.value} onChange={(e) => f.onChange(e.target.value)} options={f.options} placeholder={f.placeholder} className="sm:w-44" />
      ))}
    </div>
  );
}
