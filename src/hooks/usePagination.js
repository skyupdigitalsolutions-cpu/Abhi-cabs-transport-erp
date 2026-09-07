import { useState } from 'react';

export function usePagination(initial = { page: 1, limit: 10 }) {
  const [page, setPage] = useState(initial.page);
  const [limit, setLimit] = useState(initial.limit);
  const reset = () => setPage(1);
  return { page, limit, setPage, setLimit, reset };
}
