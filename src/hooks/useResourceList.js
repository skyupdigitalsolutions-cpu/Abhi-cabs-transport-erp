import { useCallback, useMemo, useState } from 'react';
import { useApi } from './useApi';
import { useDebounce } from './useDebounce';

/**
 * useResourceList — drives a DataTable against any CRUD service.
 * Passes filters as individual query params (not nested), so date fields
 * like "from"/"to" are sent as top-level params the backend expects.
 */
export function useResourceList(
  service,
  { limit = 10, filterDefaults = {}, sortBy: initialSortBy, sortDir: initialSortDir = 'desc', searchDebounceMs = 350 } = {}
) {
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [filters,    setFilters]    = useState(filterDefaults);
  const [sortBy,     setSortBy]     = useState(initialSortBy);
  const [sortDir,    setSortDir]    = useState(initialSortDir);
  const [reloadTick, setReloadTick] = useState(0);

  const debouncedSearch = useDebounce(search, searchDebounceMs);

  // Flatten filters into top-level params — backend expects flat query params
  // (e.g. status=COMPLETED&from=2026-01-01 NOT filters[status]=COMPLETED)
  const params = useMemo(() => {
    const flat = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) flat[k] = v;
    });
    return {
      page,
      limit,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(sortBy  ? { sortBy  } : {}),
      ...(sortDir ? { order: sortDir } : {}),
      ...flat,
    };
  }, [page, limit, debouncedSearch, filters, sortBy, sortDir]);

  const { data, status, error, refetch } = useApi(
    () => service.list(params),
    [service, JSON.stringify(params), reloadTick]
  );

  const onSearchChange = useCallback((v) => { setSearch(v); setPage(1); }, []);
  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
  const onSort = useCallback((key, dir) => {
    if (dir) {
      setSortBy(key);
      setSortDir(dir);
    } else {
      setSortBy((prev) => key);
      setSortDir((prev) => (sortBy === key && prev === 'desc' ? 'asc' : 'desc'));
    }
    setPage(1);
  }, [sortBy]);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  // Support both { data: [], meta: {} } and { items: [], pagination: {} } shapes
  const rows = data?.data ?? data?.items ?? [];
  const meta = data?.meta ?? (data?.pagination
    ? { total: data.pagination.total, limit: data.pagination.limit, totalPages: data.pagination.totalPages }
    : undefined);

  return {
    rows, meta, status, error, refetch,
    page, setPage,
    search, onSearchChange,
    filters, setFilter,
    sortBy, sortDir, onSort,
    reload,
  };
}
