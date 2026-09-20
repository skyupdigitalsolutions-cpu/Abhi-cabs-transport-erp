import { ApiError } from './apiClient';

const LATENCY = [250, 700];
const FAIL_RATE = 0; // set >0 (e.g. 0.05) locally to exercise error states

export function delay() {
  const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockResolve(data) {
  await delay();
  if (Math.random() < FAIL_RATE) {
    throw new ApiError('Simulated server error. Please try again.', { status: 500, code: 'MOCK_FAILURE' });
  }
  return data;
}

/** Applies search + filters + pagination + sort the way a real API would server-side. */
export function paginate(list, { page = 1, limit = 10, search, searchFields = [], filters = {}, sortBy, sortDir = 'desc' } = {}) {
  let rows = [...list];

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => searchFields.some((f) => String(row[f] ?? '').toLowerCase().includes(q)));
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      rows = rows.filter((row) => String(row[key]) === String(value));
    }
  });

  if (sortBy) {
    rows.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      const res = av > bv ? 1 : -1;
      return sortDir === 'asc' ? res : -res;
    });
  }

  const total = rows.length;
  const start = (page - 1) * limit;
  const pageRows = rows.slice(start, start + limit);

  return { data: pageRows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
