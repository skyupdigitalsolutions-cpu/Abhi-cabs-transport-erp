import { useCallback, useMemo, useState } from 'react';
import { useApi } from './useApi';
import { useDebounce } from './useDebounce';

/**
 * Drives a DataTable against any CRUD service: search, filters, sort and
 * server-side pagination, with a `reload` bump so create/update/delete can
 * refresh the list without re-mounting the page.
 */
export function useResourceList(service, { limit = 10, filterDefaults = {}, sortBy: initialSortBy, searchDebounceMs = 350 } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(filterDefaults);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState('desc');
  const [reloadTick, setReloadTick] = useState(0);
  const debouncedSearch = useDebounce(search, searchDebounceMs);

  const params = useMemo(
    () => ({ page, limit, search: debouncedSearch, filters, sortBy, sortDir }),
    [page, limit, debouncedSearch, filters, sortBy, sortDir]
  );

  const { data, status, error, refetch } = useApi(
    () => service.list(params),
    [service, params.page, params.limit, params.search, JSON.stringify(params.filters), params.sortBy, params.sortDir, reloadTick]
  );

  const onSearchChange = useCallback((v) => { setSearch(v); setPage(1); }, []);
  const setFilter = useCallback((key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); }, []);
  const onSort = useCallback((key) => {
    setSortBy((prev) => key);
    setSortDir((prev) => (sortBy === key && prev === 'desc' ? 'asc' : 'desc'));
  }, [sortBy]);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return {
    rows: data?.data || [], meta: data?.meta, status, error, refetch,
    page, setPage, search, onSearchChange, filters, setFilter, sortBy, sortDir, onSort, reload,
  };
}
